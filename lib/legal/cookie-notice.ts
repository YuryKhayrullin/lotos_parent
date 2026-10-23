export const cookieNoticeKey = 'lotos.cookie-notice.v1'
export const cookieNoticeLifetime = 180 * 24 * 60 * 60 * 1000
export function cookieNoticeDismissed(raw: string | null, now: number): boolean {
  if (!raw) return false
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || !('dismissedAt' in value)) return false
    const at = value.dismissedAt
    return typeof at === 'number' && Number.isFinite(at) && at <= now && now - at < cookieNoticeLifetime
  } catch {
    return false
  }
}
