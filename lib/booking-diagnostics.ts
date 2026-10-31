import type { RequestError } from './api-client'

export type PublicBookingDiagnosticAction =
  | 'publicBookingHold'
  | 'publicBookingStatus'
  | 'publicBookingConfirm'
  | 'publicBookingResend'
  | 'publicBookingCancel'

function browserName(): 'chrome' | 'safari' | 'firefox' | 'edge' | 'other' {
  const agent = navigator.userAgent.toLowerCase()
  if (agent.includes('edg/')) return 'edge'
  if (agent.includes('firefox/')) return 'firefox'
  if (agent.includes('chrome/') || agent.includes('crios/')) return 'chrome'
  if (agent.includes('safari/')) return 'safari'
  return 'other'
}

function normalizedCode(error: RequestError) {
  const value = String(error.code || (error.status ? 'HTTP_' + error.status : 'NETWORK'))
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .slice(0, 50)
  return /^[A-Z]/.test(value) ? value : 'PUBLIC_' + value.slice(0, 43)
}

export function reportBookingFailure({
  error,
  action,
  branchId,
  date,
}: {
  error: unknown
  action: PublicBookingDiagnosticAction
  branchId: string
  date: string
}) {
  const failure = error as RequestError
  const status = Number.isInteger(failure?.status) ? Math.max(0, Math.min(599, failure.status!)) : 0
  if (status > 0 && status < 500) return null
  const eventId = crypto.randomUUID()
  const code = normalizedCode(failure)
  const kind = code === 'TIMEOUT' ? 'timeout' : code === 'NETWORK' || status === 0 ? 'network' : 'http'
  const payload = {
    eventId,
    branchId,
    at: new Date().toISOString(),
    action,
    kind,
    code,
    status,
    online: navigator.onLine,
    screen: 'Онлайн-запись',
    date,
    browser: browserName(),
    mobile: matchMedia('(max-width: 767px)').matches,
  }
  void fetch('/api/parent/booking/diagnostics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
    keepalive: true,
  }).catch(() => undefined)
  return eventId
}
