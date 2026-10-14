import { z } from 'zod'
import type { Databases } from './database'
import { ApiError } from './errors'
import { createAuth } from './auth'

const sessionSchema = z.object({ user: z.object({ id: z.string(), name: z.string() }) })
export async function requireParent(runtime: Databases, headers: Headers, auth = createAuth(runtime)) {
  // asResponse preserves refreshed Set-Cookie instead of silently dropping it.
  const response = await auth.api.getSession({
    headers,
    asResponse: true,
    query: { disableCookieCache: true },
  })
  const data = sessionSchema.safeParse(await response.json())
  if (!data.success) throw new ApiError(401, 'UNAUTHENTICATED', 'Войдите в кабинет родителя.')
  const user = await runtime.parent.user.findUnique({
    where: { id: data.data.user.id },
    select: { id: true, name: true, enabled: true },
  })
  if (!user?.enabled) throw new ApiError(401, 'UNAUTHENTICATED', 'Войдите в кабинет родителя.')
  return { user, cookies: response.headers.getSetCookie() }
}
export async function requireChild(runtime: Databases, userId: string, clientId: string) {
  const link = await runtime.parent.parentChildLink.findUnique({
    where: { parentUserId_crmClientId: { parentUserId: userId, crmClientId: clientId } },
    select: { revokedAt: true, user: { select: { enabled: true } } },
  })
  if (!link || link.revokedAt || !link.user.enabled)
    throw new ApiError(404, 'NOT_FOUND', 'Ребёнок не найден.')
}
