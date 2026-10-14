import { randomUUID } from 'node:crypto'
import { ConfigurationError } from './config'
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}
export function json(data: unknown, status = 200, cookies: string[] = []) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie',
  })
  for (const cookie of cookies) headers.append('Set-Cookie', cookie)
  return new Response(JSON.stringify(data), { status, headers })
}
export function failure(error: unknown) {
  if (error instanceof ApiError) return json({ error: error.message, code: error.code }, error.status)
  const requestId = randomUUID()
  console.error('parent-request-error', {
    requestId,
    kind: error instanceof ConfigurationError ? 'configuration' : 'dependency',
  })
  return json(
    { error: 'Не удалось загрузить данные клуба. Попробуйте позже.', code: 'UNAVAILABLE', requestId },
    503,
  )
}
