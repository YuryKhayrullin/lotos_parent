import 'server-only'
import { createHash, createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { configuration, type Configuration } from './config'
import { ApiError } from './errors'
import type { Child, Overview } from '../contracts'
import { parseApiResponse } from '../response-contracts'

export function gatewaySignature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  cookie: string,
  ip: string,
  body: string,
) {
  return createHmac('sha256', secret)
    .update([timestamp, method, path, cookie, ip, createHash('sha256').update(body).digest('hex')].join('\n'))
    .digest('hex')
}
export function parentCookies(value: string) {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter((part) => /^(?:__Secure-)?lotos_parent\.[a-z0-9_]+=/.test(part))
    .join('; ')
}
function clientIp(headers: Headers, config: Configuration) {
  if (['local', 'test'].includes(config.APP_ENV)) return '127.0.0.1'
  if (config.VERCEL === '1') {
    const ip = headers.get('x-vercel-forwarded-for') || ''
    if (isIP(ip)) return ip
  }
  return '127.0.0.1'
}
export async function crmRequest(
  path: string,
  headers: Headers,
  options: { method?: 'GET' | 'POST'; body?: string } = {},
) {
  const start = performance.now()
  const config = configuration()
  const trace =
    config.APP_ENV === 'test' &&
    process.env.LOTOS_STABILITY_PARENT_TIMING === '1' &&
    /^(?:bootstrap|children\/[^/?]+\/overview)(?:\?|$)/.test(path)
  const method = options.method || 'GET',
    body = options.body || ''
  if (
    method === 'POST' &&
    !['local', 'test'].includes(config.APP_ENV) &&
    (config.VERCEL !== '1' || !isIP(headers.get('x-vercel-forwarded-for') || ''))
  )
    throw new ApiError(503, 'UNAVAILABLE', 'Вход временно недоступен')
  const cookie = parentCookies(headers.get('cookie') || '')
  const url = new URL('/api/parent/' + path, config.CRM_API_URL)
  if (!url.pathname.startsWith('/api/parent/') || url.origin !== new URL(config.CRM_API_URL).origin)
    throw new ApiError(400, 'INPUT', 'Недопустимый маршрут')
  const timestamp = Date.now().toString(),
    ip = clientIp(headers, config)
  const signature = gatewaySignature(
    config.CRM_GATEWAY_SECRET,
    timestamp,
    method,
    url.pathname + url.search,
    cookie,
    ip,
    body,
  )
  const upstreamStart = performance.now()
  let result: Response
  try {
    result = await fetch(url, {
      method,
      headers: {
        cookie,
        'content-type': 'application/json',
        'x-lotos-parent-time': timestamp,
        'x-lotos-parent-signature': signature,
        'x-lotos-parent-ip': ip,
      },
      ...(method === 'POST' ? { body } : {}),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    })
  } catch {
    throw new ApiError(503, 'UNAVAILABLE', 'Сервис клуба временно недоступен. Попробуйте позже.')
  }
  const upstreamMs = performance.now() - upstreamStart
  if (!/^application\/json(?:;|$)/i.test(result.headers.get('content-type') || '')) {
    await result.body?.cancel()
    throw new ApiError(503, 'UNAVAILABLE', 'Сервис клуба временно недоступен. Попробуйте позже.')
  }
  const output = new Headers({
    'content-type': 'application/json',
    'cache-control': 'private, no-store',
    vary: 'Cookie',
  })
  for (const value of result.headers.getSetCookie()) {
    if (/^(?:__Secure-)?lotos_parent\./.test(value) && !/;\s*domain=/i.test(value))
      output.append('set-cookie', value)
  }
  if (trace) {
    const serverTiming = result.headers.get('server-timing')
    output.set(
      'server-timing',
      [
        serverTiming,
        'parent_upstream;dur=' + upstreamMs.toFixed(2),
        'parent_gateway;dur=' + (performance.now() - start).toFixed(2),
      ]
        .filter(Boolean)
        .join(', '),
    )
  }
  return new Response(result.body, { status: result.status, headers: output })
}
export async function crmJson<T>(path: string, headers: Headers): Promise<T> {
  const start = performance.now()
  const response = await crmRequest(path, headers)
  let data
  try {
    data = await response.json()
  } catch {
    throw new ApiError(503, 'UNAVAILABLE', 'Сервис клуба временно недоступен. Попробуйте позже.')
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new ApiError(503, 'UNAVAILABLE', 'Сервис клуба вернул некорректный ответ.')
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof data.code === 'string' ? data.code : 'UNAVAILABLE',
      typeof data.error === 'string' ? data.error : 'Сервис клуба временно недоступен',
    )
  try {
    const route = path.startsWith('auth/') ? '/api/' + path : '/api/parent/' + path
    const value = parseApiResponse(route, data) as T
    const id = headers.get('x-lotos-benchmark-id')
    const timings = response.headers.get('server-timing')
    if (timings && id && /^[a-f0-9-]{36}$/.test(id)) {
      console.info(
        'LOTOS_PARENT_TIMING ' +
          JSON.stringify({
            id,
            timings: timings + ', parent_bootstrap;dur=' + (performance.now() - start).toFixed(2),
          }),
      )
    }
    return value
  } catch {
    throw new ApiError(503, 'UNAVAILABLE', 'Сервис клуба вернул некорректные данные. Попробуйте позже.')
  }
}
export type Identity = { id: string; name: string }
export async function crmReady() {
  const response = await crmRequest('auth/get-session?refresh=0', new Headers())
  const data: unknown = await response.json()
  return (
    response.status === 401 &&
    !!data &&
    typeof data === 'object' &&
    'code' in data &&
    data.code === 'UNAUTHORIZED' &&
    'error' in data &&
    typeof data.error === 'string'
  )
}
export async function parentSession(headers: Headers) {
  const data = await crmJson<{ user: Identity }>('auth/get-session?refresh=0', headers)
  return data.user
}
export function parentBootstrap(headers: Headers, child: string, week: string) {
  const params = new URLSearchParams()
  if (child && child.length <= 100) params.set('child', child)
  if (week) params.set('week', week)
  return crmJson<{ user: Identity; children: Child[]; overview: Overview | null }>(
    'bootstrap' + (params.size ? '?' + params : ''),
    headers,
  )
}
