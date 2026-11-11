import test from 'node:test'
import assert from 'node:assert/strict'
import { parseApiResponse } from '../lib/response-contracts'
import { requestJson } from '../lib/api-client'

const child = {
  id: 'child-a',
  name: 'Ребёнок',
  birthDate: null,
  branchName: 'Филиал',
  timeZone: 'Europe/Moscow',
  category: 'swimming',
  lessonsPerWeek: 2,
  status: 'active',
}
const overview = {
  child,
  remainingLessons: 8,
  weekStart: '2026-10-19',
  weekEnd: '2026-10-25',
  nextLesson: null,
  schedule: [],
  attendance: { attended: 0, absent: 0, unmarked: 0, percent: null, from: '2026-09-20', to: '2026-10-19' },
  history: [],
  historyHasMore: false,
  payments: { items: [], nextCursor: null },
  updatedAt: '2026-10-19T10:00:00Z',
}

test('training format survives children and overview response validation', () => {
  for (const trainingFormat of ['water', 'water_gym', null]) {
    const value = { ...child, trainingFormat }
    const family = parseApiResponse('/api/parent/children', {
      parentName: 'Родитель',
      children: [value],
    }) as { children: (typeof value)[] }
    assert.equal(family.children[0].trainingFormat, trainingFormat)
    const result = parseApiResponse('/api/parent/children/child-a/overview', {
      ...overview,
      child: value,
    }) as { child: typeof value }
    assert.equal(result.child.trainingFormat, trainingFormat)
  }
  assert.throws(() =>
    parseApiResponse('/api/parent/children/child-a/overview', {
      ...overview,
      child: { ...child, trainingFormat: 'invalid' },
    }),
  )
})

test('malformed upstream data and a mismatched child are rejected before rendering', () => {
  const path = '/api/parent/children/child-a/overview'
  assert.equal((parseApiResponse(path, overview) as typeof overview).child.id, 'child-a')
  for (const invalid of [
    null,
    [],
    { ...overview, child: { ...child, id: 'child-b' } },
    { ...overview, child: { ...child, timeZone: 'Invalid/Zone' } },
    { ...overview, weekStart: '2026-02-30' },
    {
      ...overview,
      payments: {
        items: [
          {
            id: 'payment',
            paidAt: '2026-10-19T10:00:00Z',
            amountMinor: 'invalid',
            lessonsAdded: 8,
            packageLessons: 8,
          },
        ],
        nextCursor: null,
      },
    },
  ])
    assert.throws(() => parseApiResponse(path, invalid))
  assert.throws(() => parseApiResponse('/api/auth/get-session', { user: null }))
})

test('client treats invalid successful responses and network failures as recoverable errors', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true }))
  await assert.rejects(requestJson('/api/parent/children/child-a/overview'), /некорректные данные/)
  fetch.mock.mockImplementation(async () => {
    throw new TypeError('network failure')
  })
  await assert.rejects(requestJson('/api/parent/children/child-a/overview'), /Нет соединения/)
  fetch.mock.mockImplementation(async () => new Response('<html>unavailable</html>', { status: 503 }))
  await assert.rejects(requestJson('/api/parent/children/child-a/overview'), /прочитать ответ/)
  fetch.mock.mockImplementation(async () => Response.json({ error: 'Нужен вход' }, { status: 401 }))
  await assert.rejects(
    requestJson('/api/auth/get-session'),
    (error) => error instanceof Error && 'status' in error && error.status === 401,
  )
})

test('invitation and recovery states reject broken upstream responses', () => {
  for (const route of ['/api/auth/invitation-status', '/api/auth/recovery-status']) {
    assert.equal((parseApiResponse(route, { state: 'expired' }) as { state: string }).state, 'expired')
    assert.throws(() => parseApiResponse(route, { state: 'made-up' }))
    assert.throws(() => parseApiResponse(route, { state: 'valid', sharedAccount: 'yes' }))
  }
  assert.throws(() => parseApiResponse('/api/auth/reset-password', { success: false }))
  assert.deepEqual(parseApiResponse('/api/auth/request-password-reset', { accepted: true }), {
    accepted: true,
  })
  assert.throws(() => parseApiResponse('/api/auth/request-password-reset', { accepted: false }))
  assert.deepEqual(
    parseApiResponse('/api/parent/children/child-a/schedule', {
      from: '2026-10-01',
      to: '2026-11-11',
      schedule: [],
    }),
    { from: '2026-10-01', to: '2026-11-11', schedule: [] },
  )
})

test('subscription dates and balances are validated while older overview responses remain supported', () => {
  const path = '/api/parent/children/child-a/overview'
  const subscription = {
    availableLessons: 4,
    items: [
      { id: 'period', startsOn: '2026-11-01', endsOn: '2026-11-30', totalLessons: 4, remainingLessons: 4 },
    ],
  }
  assert.ok(parseApiResponse(path, { ...overview, subscription }))
  for (const item of [
    { ...subscription.items[0], endsOn: '2026-10-31' },
    { ...subscription.items[0], remainingLessons: 5 },
    { ...subscription.items[0], startsOn: '2026-02-30' },
  ])
    assert.throws(() =>
      parseApiResponse(path, { ...overview, subscription: { ...subscription, items: [item] } }),
    )
})
