import 'server-only'
import { crmRequest } from '@/lib/server/crm-api'
import { failure, json } from '@/lib/server/errors'
import { configuration } from '@/lib/server/config'
import { ApiError } from '@/lib/server/errors'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const paths = (await context.params).path
    if (request.method === 'POST') {
      if (
        paths[0] === 'booking' &&
        ((paths.length === 2 && paths[1] === 'catalog') ||
          (paths.length === 4 && paths[1] === 'branches' && paths[3] === 'lessons'))
      )
        return new Response(null, { status: 405, headers: { allow: 'GET', 'cache-control': 'no-store' } })
      if (
        paths.length !== 2 ||
        paths[0] !== 'booking' ||
        !['hold', 'confirm', 'status', 'cancel'].includes(paths[1])
      )
        return json({ error: 'Не найдено' }, 404)
      if (
        request.headers.get('origin') !== new URL(configuration().APP_URL).origin ||
        request.headers.get('sec-fetch-site') === 'cross-site'
      )
        throw new ApiError(403, 'ORIGIN', 'Недопустимый источник запроса')
      if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || ''))
        throw new ApiError(415, 'INPUT', 'Ожидается application/json')
      const reader = request.body?.getReader()
      if (!reader) throw new ApiError(400, 'INPUT', 'Проверьте данные')
      let length = 0
      const chunks: Uint8Array[] = []
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
      } finally {
        reader.releaseLock()
      }
      const body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length))
      return await crmRequest(paths.join('/'), request.headers, { method: 'POST', body })
    }
    const allowed =
      (paths.length === 2 && paths[0] === 'booking' && paths[1] === 'catalog') ||
      (paths.length === 4 &&
        paths[0] === 'booking' &&
        paths[1] === 'branches' &&
        paths[2].length <= 100 &&
        !paths[2].includes('/') &&
        paths[3] === 'lessons') ||
      (paths.length === 1 && paths[0] === 'children') ||
      (paths.length === 3 &&
        paths[0] === 'children' &&
        paths[1].length <= 100 &&
        !paths[1].includes('/') &&
        ['overview', 'payments', 'schedule'].includes(paths[2]))
    if (!allowed) return json({ error: 'Не найдено' }, 404)
    const query = new URL(request.url).search
    return await crmRequest(paths.map(encodeURIComponent).join('/') + query, request.headers)
  } catch (error) {
    return failure(error)
  }
}
export const GET = handle
export const POST = handle
