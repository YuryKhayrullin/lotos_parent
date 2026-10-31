import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearPendingBookingRequest,
  ensurePendingBookingRequest,
  readPendingBookingRequest,
} from '../lib/booking-request'

class MemoryStorage {
  values = new Map<string, string>()
  get length() {
    return this.values.size
  }
  clear() {
    this.values.clear()
  }
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.values.delete(key)
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

test('booking request id survives a lost response and contains no family data', () => {
  const storage = new MemoryStorage() as Storage
  const first = ensurePendingBookingRequest(storage, 'lesson-1', () => '11111111-1111-4111-8111-111111111111')
  const restored = ensurePendingBookingRequest(storage, 'lesson-1', () => {
    throw new Error('must not generate another id')
  })
  assert.deepEqual(restored, first)
  assert.equal(readPendingBookingRequest(storage, 'lesson-1')?.requestId, first.requestId)
  const raw = JSON.stringify([...(storage as unknown as MemoryStorage).values.values()])
  assert.doesNotMatch(raw, /email|phone|child|parent|password/i)
})

test('expired or mismatched attempts are removed and a confirmed attempt can be cleared', () => {
  const storage = new MemoryStorage() as Storage
  const now = Date.now()
  ;(storage as unknown as MemoryStorage).setItem(
    'lotos-booking-request:lesson-1',
    JSON.stringify({
      requestId: '11111111-1111-4111-8111-111111111111',
      lessonId: 'lesson-1',
      createdAt: now - 25 * 60 * 60 * 1000,
    }),
  )
  assert.equal(readPendingBookingRequest(storage, 'lesson-1', now), null)
  const current = ensurePendingBookingRequest(
    storage,
    'lesson-1',
    () => '22222222-2222-4222-8222-222222222222',
  )
  assert.equal(current.requestId, '22222222-2222-4222-8222-222222222222')
  clearPendingBookingRequest(storage, 'lesson-1')
  assert.equal(readPendingBookingRequest(storage, 'lesson-1'), null)
})
