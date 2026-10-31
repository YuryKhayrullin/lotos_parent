import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addDays,
  weekStart,
  monthBounds,
  moveMonth,
  dayInZone,
  rangeDays,
  bookingDaySchema,
  bookingLink,
  priceLabel,
  ageLabel,
  availabilityV2Schema,
  catalogV2Schema,
  lessonsV2Schema,
} from '../lib/booking-v2'
import { bookingImageOrigins, contentSecurityPolicy } from '../lib/server/content-security-policy'

test('calendar preserves local dates across leap day, year and browser timezone', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(weekStart('2027-01-01'), '2026-12-28')
  assert.deepEqual(monthBounds('2028-02-20'), { from: '2028-02-01', to: '2028-02-29' })
  assert.equal(moveMonth('2026-12-31', 1), '2027-01-01')
  assert.equal(dayInZone('2026-10-30T22:30:00Z', 'Europe/Moscow'), '2026-10-31')
  assert.equal(dayInZone('2026-10-30T22:30:00Z', 'America/Los_Angeles'), '2026-10-30')
  assert.equal(rangeDays('2028-02-01', '2028-02-29').length, 29)
  assert.equal(bookingDaySchema.safeParse('2026-02-30').success, false)
})
test('booking link retains branch, date, direction, selected lesson and search safely', () => {
  const url = new URL(
    bookingLink('branch', '2026-11-06', 'swimming', 'lesson', { q: 'Metro & Address', city: 'Moscow' }),
    'https://parent.test',
  )
  assert.equal(url.pathname, '/book/branch')
  assert.equal(url.searchParams.get('date'), '2026-11-06')
  assert.equal(url.searchParams.get('lesson'), 'lesson')
  assert.equal(url.searchParams.get('q'), 'Metro & Address')
  assert.equal(url.searchParams.get('category'), 'swimming')
  assert.equal(priceLabel('0'), 'Бесплатно')
  assert.equal(ageLabel(60), '5 лет')
  assert.equal(ageLabel(143), '11 лет 11 мес.')
  assert.ok(priceLabel('150050').includes('500,5'))
})
const now = '2026-10-30T10:00:00.000Z',
  range = { from: '2026-10-30', to: '2026-10-31' }
const offer = {
  category: 'swimming',
  title: 'Swimming',
  published: true,
  trialPriceMinor: '150050',
  currency: 'RUB',
  minAgeMonths: null,
  maxAgeMonths: null,
  conditions: '',
}
const branch = {
  id: 'b',
  name: 'Pool',
  address: 'Address',
  city: 'City',
  timeZone: 'Europe/Moscow',
  metro: null,
  photoUrl: null,
  arrivalText: null,
  bookingEnabled: true,
  offers: [offer],
}
test('catalog contract strips internal data and rejects invalid public metadata', () => {
  const data = {
    schemaVersion: 2,
    generatedAt: now,
    cities: ['City'],
    branches: [{ ...branch, coachUserId: 'secret' }],
    nextCursor: null,
  }
  assert.equal(JSON.stringify(catalogV2Schema.parse(data)).includes('secret'), false)
  assert.equal(
    catalogV2Schema.safeParse({ ...data, branches: [{ ...branch, photoUrl: 'javascript:alert(1)' }] })
      .success,
    false,
  )
})
test('calendar contract separates no coverage, empty and open and rejects false availability', () => {
  const base = {
    branchId: 'b',
    timeZone: 'Europe/Moscow',
    bookingEnabled: true,
    coveredRange: range,
    bookableRange: { ...range, until: now },
    nextAvailableStartsAt: now,
    days: [{ date: range.from, state: 'open', availableLessonCount: 2, nearestAvailableStartsAt: now }],
  }
  const body = { schemaVersion: 2, generatedAt: now, requestedRange: range, branches: [base] }
  assert.ok(availabilityV2Schema.safeParse(body).success)
  assert.equal(
    availabilityV2Schema.safeParse({ ...body, branches: [{ ...base, coveredRange: null }] }).success,
    false,
  )
  assert.ok(
    availabilityV2Schema.safeParse({ ...body, branches: [{ ...base, coveredRange: null, days: [] }] })
      .success,
  )
  assert.equal(
    availabilityV2Schema.safeParse({
      ...body,
      branches: [{ ...base, days: [{ ...base.days[0], availableLessonCount: 0 }] }],
    }).success,
    false,
  )
})
test('detail contract rejects a lesson from another branch and overbooked counts', () => {
  const lesson = {
    id: 'l',
    branchId: 'b',
    title: 'Lesson',
    category: 'swimming',
    localDate: range.from,
    startsAt: now,
    endsAt: '2026-10-30T11:00:00.000Z',
    timeZone: 'Europe/Moscow',
    location: null,
    capacity: 1,
    coachName: 'Coach',
    available: 1,
    publicOffer: offer,
  }
  const body = {
    schemaVersion: 2,
    generatedAt: now,
    branchId: 'b',
    coveredRange: range,
    bookableRange: { ...range, until: now },
    bookingEnabled: true,
    lessons: [lesson],
    nextCursor: null,
  }
  assert.ok(lessonsV2Schema.safeParse(body).success)
  assert.equal(
    lessonsV2Schema.safeParse({ ...body, lessons: [{ ...lesson, branchId: 'foreign' }] }).success,
    false,
  )
  assert.equal(lessonsV2Schema.safeParse({ ...body, lessons: [{ ...lesson, available: 2 }] }).success, false)
})
test('public photo CSP allows only explicit origins without widening scripts or connections', () => {
  const hosts = bookingImageOrigins({
    CRM_API_URL: 'https://crm.example.test/api',
    BOOKING_PHOTO_HOSTS: 'images.example.test,*.unsafe.test,evil.test;script-src *,bad..test',
  })
  assert.deepEqual(hosts, ['https://crm.example.test', 'https://images.example.test'])
  assert.deepEqual(bookingImageOrigins({ CRM_API_URL: 'http://127.0.0.1:3192', APP_ENV: 'production' }), [])
  const csp = contentSecurityPolicy('a'.repeat(43) + '=', false, true, false, hosts)
  assert.ok(csp.includes("img-src 'self' blob: data: https://crm.example.test https://images.example.test"))
  assert.ok(csp.includes("connect-src 'self';"))
  assert.ok(!contentSecurityPolicy('a'.repeat(43) + '=', false, true).includes('images.example.test'))
})
