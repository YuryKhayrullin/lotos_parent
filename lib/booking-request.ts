export type PendingBookingRequest = {
  requestId: string
  lessonId: string
  createdAt: number
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000
const key = (lessonId: string) => 'lotos-booking-request:' + lessonId

export function readPendingBookingRequest(storage: Storage, lessonId: string, now = Date.now()) {
  try {
    const raw = storage.getItem(key(lessonId))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<PendingBookingRequest>
    if (
      typeof value.requestId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(value.requestId) ||
      value.lessonId !== lessonId ||
      typeof value.createdAt !== 'number' ||
      value.createdAt > now + 60000 ||
      value.createdAt < now - MAX_AGE_MS
    ) {
      storage.removeItem(key(lessonId))
      return null
    }
    return value as PendingBookingRequest
  } catch {
    return null
  }
}

export function ensurePendingBookingRequest(
  storage: Storage,
  lessonId: string,
  createId: () => string = () => crypto.randomUUID(),
) {
  const existing = readPendingBookingRequest(storage, lessonId)
  if (existing) return existing
  const value: PendingBookingRequest = { requestId: createId(), lessonId, createdAt: Date.now() }
  storage.setItem(key(lessonId), JSON.stringify(value))
  return value
}

export function clearPendingBookingRequest(storage: Storage, lessonId: string) {
  storage.removeItem(key(lessonId))
}
