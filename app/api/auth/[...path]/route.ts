import 'server-only'
import { configuration } from '@/lib/server/config'
import { crmRequest } from '@/lib/server/crm-api'
import { failure, json, ApiError } from '@/lib/server/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const path = (await context.params).path.join('/')
    const allowed =
      (request.method === 'GET' && path === 'get-session') ||
      (request.method === 'POST' && ['sign-in/email', 'sign-out', 'activate'].includes(path))
    if (!allowed) return json({ error: 'Не найдено' }, 404)
    let body = ''
    if (request.method === 'POST') {
      if (
        request.headers.get('origin') !== new URL(configuration().APP_URL).origin ||
        request.headers.get('sec-fetch-site') === 'cross-site'
      )
        throw new ApiError(403, 'ORIGIN', 'Недопустимый источник запроса')
      if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || ''))
        throw new ApiError(415, 'INPUT', 'Ожидается application/json')
      const reader = request.body?.getReader()
      if (!reader) throw new ApiError(400, 'INPUT', 'Проверьте данные')
      const chunks: Uint8Array[] = []
      let length = 0
      try {
        for (;;) {
          const value = await reader.read()
          if (value.done) break
          length += value.value.length
          if (length > 4096) {
            await reader.cancel()
            throw new ApiError(413, 'INPUT', 'Запрос слишком большой')
          }
          chunks.push(value.value)
        }
        body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length))
      } finally {
        reader.releaseLock()
      }
    }
    return await crmRequest('auth/' + path, request.headers, {
      method: request.method as 'GET' | 'POST',
      body,
    })
  } catch (error) {
    return failure(error)
  }
}
export const GET = handle
export const POST = handle
