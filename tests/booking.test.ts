import test from 'node:test'
import assert from 'node:assert/strict'
import {
  bookingCatalogSchema,
  bookingLessonsSchema,
  bookingCityUrl,
  bookingBranchUrl,
  bookingMapUrl,
} from '../lib/booking-contracts'
import { parseApiResponse } from '../lib/response-contracts'
import { contentSecurityPolicy } from '../lib/server/content-security-policy'
const branch = { id: 'branch-a', name: 'Бассейн', city: 'Москва', address: 'Москва, улица 1' }
test('public booking contracts strip private fields and reject broken capacity', () => {
  const catalog = parseApiResponse('/api/parent/booking/catalog', {
    branches: [{ ...branch, clients: [{ phone: 'private' }] }],
  })
  assert.deepEqual(catalog, { branches: [branch] })
  assert.equal(bookingCatalogSchema.safeParse({ branches: [{ ...branch, city: '' }] }).success, false)
  const lesson = {
    id: 'lesson-a',
    title: 'Плавание',
    category: 'swimming',
    localDate: '2026-10-20',
    startsAt: '2026-10-20T12:00:00Z',
    endsAt: '2026-10-20T13:00:00Z',
    timeZone: 'Europe/Moscow',
    location: null,
    capacity: 10,
    available: 2,
    coachName: 'Тренер',
  }
  assert.deepEqual(bookingLessonsSchema.parse({ lessons: [{ ...lesson, enrollments: ['secret'] }] }), {
    bookingEnabled: false,
    lessons: [lesson],
  })
  for (const change of [
    { available: 11 },
    { available: -1 },
    { timeZone: 'Invalid/Zone' },
    { endsAt: lesson.startsAt },
  ])
    assert.equal(bookingLessonsSchema.safeParse({ lessons: [{ ...lesson, ...change }] }).success, false)
})
test('booking URLs encode user-provided values and maps have a fixed trusted origin', () => {
  assert.equal(bookingBranchUrl('one/two?x'), '/book/one%2Ftwo%3Fx')
  assert.equal(
    new URL(bookingCityUrl('Москва & область'), 'http://local').searchParams.get('city'),
    'Москва & область',
  )
  const map = new URL(bookingMapUrl({ ...branch, address: 'https://foreign.invalid/?x=<script>' }, true))
  assert.equal(map.origin, 'https://yandex.ru')
  assert.equal(map.pathname, '/map-widget/v1/')
  assert.equal(map.searchParams.get('text'), 'Москва, https://foreign.invalid/?x=<script>')
})
test('only booking pages allow the isolated map frame; script policy remains strict', () => {
  const nonce = 'a'.repeat(43) + '='
  assert.match(contentSecurityPolicy(nonce, false, true), /frame-src 'none'/)
  const policy = contentSecurityPolicy(nonce, false, true, true)
  assert.match(policy, /frame-src https:\/\/yandex.ru\/map-widget\//)
  assert.match(policy, /script-src-attr 'none'/)
  assert.doesNotMatch(policy, /unsafe-eval/)
})
