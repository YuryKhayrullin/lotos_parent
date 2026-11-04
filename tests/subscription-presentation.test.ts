import test from 'node:test'
import assert from 'node:assert/strict'
import type { Overview } from '../lib/contracts'
import { subscriptionPresentation } from '../lib/subscription-presentation'
const overview = {
  child: { timeZone: 'Europe/Moscow' },
  remainingLessons: 4,
  updatedAt: '2026-11-25T09:00:00Z',
  subscription: {
    availableLessons: 4,
    items: [
      { id: 'current', startsOn: '2026-11-01', endsOn: '2026-11-30', totalLessons: 4, remainingLessons: 4 },
    ],
  },
} as Overview
test('expiry reminder appears five days before; prepaid next package suppresses payment demand', () => {
  assert.equal(subscriptionPresentation(overview).remind, true)
  const prepaid = {
    ...overview,
    subscription: {
      ...overview.subscription!,
      items: [
        ...overview.subscription!.items,
        { id: 'next', startsOn: '2026-12-01', endsOn: '2026-12-30', totalLessons: 4, remainingLessons: 4 },
      ],
    },
  }
  const value = subscriptionPresentation(prepaid)
  assert.equal(value.remind, false)
  assert.equal(value.next?.id, 'next')
})
test('legacy responses do not invent expiry from last payment or request payment', () => {
  const result = subscriptionPresentation({ ...overview, subscription: undefined })
  assert.equal(result.current, undefined)
  assert.equal(result.remind, false)
  assert.equal(result.remaining, 4)
})
test('future package is not counted as currently available or presented as expired', () => {
  const result = subscriptionPresentation({
    ...overview,
    remainingLessons: 4,
    subscription: {
      availableLessons: 0,
      items: [
        { id: 'future', startsOn: '2026-12-01', endsOn: '2026-12-30', totalLessons: 4, remainingLessons: 4 },
      ],
    },
  })
  assert.equal(result.upcoming, true)
  assert.equal(result.remind, false)
  assert.equal(result.remaining, 0)
})
test('Moscow midnight controls expiry regardless of phone timezone', () => {
  const result = subscriptionPresentation({
    ...overview,
    updatedAt: '2026-11-30T21:01:00Z',
    subscription: { ...overview.subscription!, availableLessons: 0 },
  })
  assert.equal(result.expired, true)
})
