import 'server-only'
import { createHash, createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { configuration, type Configuration } from './config'
import { ApiError } from './errors'
import type { Child, Overview } from '../contracts'

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
  const config = configuration()
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
  const output = new Headers({
    'content-type': 'application/json',
    'cache-control': 'private, no-store',
    vary: 'Cookie',
  })
  for (const value of result.headers.getSetCookie()) {
    if (/^(?:__Secure-)?lotos_parent\./.test(value) && !/;\s*domain=/i.test(value))
      output.append('set-cookie', value)
  }
  return new Response(result.body, { status: result.status, headers: output })
}
export async function crmJson<T>(path: string, headers: Headers): Promise<T> {
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
  return data as T
}
export type Identity = { id: string; name: string }
export async function parentSession(headers: Headers) {
  const data = await crmJson<{ user: Identity }>('auth/get-session?refresh=0', headers)
  return data.user
}
export async function parentBootstrap(headers: Headers) {
  const user = await parentSession(headers)
  const { children } = await crmJson<{ children: Child[] }>('children', headers)
  const overview = children[0]
    ? await crmJson<Overview>('children/' + encodeURIComponent(children[0].id) + '/overview', headers)
    : null
  return { user, children, overview }
}
