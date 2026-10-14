import 'server-only'
import { z } from 'zod'
import { databases } from '@/lib/server/database'
import { getAuth } from '@/lib/server/auth'
import { loginBudget } from '@/lib/server/rate-limit'
import { failure, json, ApiError } from '@/lib/server/errors'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const login = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(200),
    rememberMe: z.boolean().optional(),
  })
  .strict()
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/')
  const allowed =
    (request.method === 'GET' && path === 'get-session') ||
    (request.method === 'POST' && ['sign-in/email', 'sign-out'].includes(path))
  if (!allowed) return json({ error: 'Не найдено' }, 404)
  try {
    const db = databases()
    if (request.method === 'POST') {
      if (request.headers.get('origin') !== new URL(db.config.APP_URL).origin)
        throw new ApiError(403, 'ORIGIN', 'Недопустимый источник запроса.')
    }
    let input = request
    if (path === 'sign-in/email') {
      const text = await request.text()
      if (text.length > 4096) throw new ApiError(400, 'INPUT', 'Проверьте данные для входа.')
      let body: z.infer<typeof login>
      try {
        body = login.parse(JSON.parse(text))
      } catch {
        throw new ApiError(400, 'INPUT', 'Проверьте email и пароль.')
      }
      await loginBudget(db, request.headers, body.email)
      input = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(body),
      })
    }
    const result = await getAuth().handler(input)
    if (path === 'sign-in/email' && !result.ok)
      return json({ error: 'Неверный email или пароль.' }, result.status === 429 ? 429 : 401)
    if (path === 'sign-in/email' || path === 'get-session') {
      const data = await result.json()
      return json(
        data?.user ? { user: { id: data.user.id, name: data.user.name } } : null,
        result.status,
        result.headers.getSetCookie(),
      )
    }
    const headers = new Headers(result.headers)
    headers.set('Cache-Control', 'private, no-store')
    headers.set('Vary', 'Cookie')
    return new Response(result.body, { status: result.status, headers })
  } catch (error) {
    return failure(error)
  }
}
export const GET = handle
export const POST = handle
