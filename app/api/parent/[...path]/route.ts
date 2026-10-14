import 'server-only'
import { ZodError } from 'zod'
import { databases } from '@/lib/server/database'
import { getAuth } from '@/lib/server/auth'
import { requireParent } from '@/lib/server/access'
import { readChildren, readOverview, parentPayments } from '@/lib/server/crm-read'
import { failure, json, ApiError } from '@/lib/server/errors'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const paths = (await context.params).path
    const db = databases()
    const actor = await requireParent(db, request.headers, getAuth())
    if (paths.length === 1 && paths[0] === 'children') {
      return json(
        { parentName: actor.user.name, children: await readChildren(db, actor.user.id) },
        200,
        actor.cookies,
      )
    }
    if (paths.length === 3 && paths[0] === 'children') {
      const params = new URL(request.url).searchParams
      if (paths[2] === 'overview')
        return json(
          await readOverview(db, actor.user.id, paths[1], params.get('week') || undefined),
          200,
          actor.cookies,
        )
      if (paths[2] === 'payments') {
        const cursor = params.get('cursor') || undefined
        if (cursor && cursor.length > 1000) throw new ApiError(400, 'INPUT', 'Неверная страница оплат.')
        return json(await parentPayments(db, actor.user.id, paths[1], cursor), 200, actor.cookies)
      }
    }
    return json({ error: 'Не найдено' }, 404)
  } catch (error) {
    if (error instanceof ZodError) return json({ error: 'Проверьте параметры запроса.' }, 400)
    return failure(error)
  }
}
