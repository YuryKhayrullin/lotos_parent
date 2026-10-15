import 'server-only'
import { crmRequest } from '@/lib/server/crm-api'
import { failure, json } from '@/lib/server/errors'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const paths = (await context.params).path
    const allowed =
      (paths.length === 1 && paths[0] === 'children') ||
      (paths.length === 3 &&
        paths[0] === 'children' &&
        paths[1].length <= 100 &&
        !paths[1].includes('/') &&
        ['overview', 'payments'].includes(paths[2]))
    if (!allowed) return json({ error: 'Не найдено' }, 404)
    const query = new URL(request.url).search
    return await crmRequest(paths.map(encodeURIComponent).join('/') + query, request.headers)
  } catch (error) {
    return failure(error)
  }
}
