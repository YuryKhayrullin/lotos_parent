import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import type { Databases } from './database'
import { ApiError } from './errors'

export async function loginBudget(runtime: Databases, headers: Headers, email: string) {
  const trusted =
    runtime.config.VERCEL === '1' ? headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : null
  const buckets = [{ identity: 'login:' + email.trim().toLowerCase(), limit: 12 }]
  if (trusted && isIP(trusted)) buckets.push({ identity: 'ip:' + trusted, limit: 60 })
  const keys = buckets
    .map((bucket) => ({
      key: createHmac('sha256', runtime.config.BETTER_AUTH_SECRET).update(bucket.identity).digest('hex'),
      limit: bucket.limit,
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
  const blocked = await runtime.parent.$transaction(async (tx) => {
    let exceeded = false
    for (const bucket of keys) {
      const [row] = await tx.$queryRaw<Array<{ hits: number }>>`
        INSERT INTO parent.rate_buckets (key,hits,expires_at) VALUES (${bucket.key},1,now()+interval '15 minutes')
        ON CONFLICT (key) DO UPDATE SET
          hits = CASE WHEN parent.rate_buckets.expires_at <= now() THEN 1 ELSE parent.rate_buckets.hits + 1 END,
          expires_at = CASE WHEN parent.rate_buckets.expires_at <= now() THEN now()+interval '15 minutes' ELSE parent.rate_buckets.expires_at END
        RETURNING hits
      `
      if (row.hits > bucket.limit) exceeded = true
    }
    await tx.$executeRaw`DELETE FROM parent.rate_buckets WHERE key IN
      (SELECT key FROM parent.rate_buckets WHERE expires_at < now()-interval '1 day' LIMIT 100)`
    return exceeded
  })
  if (blocked)
    throw new ApiError(429, 'RATE_LIMIT', 'Слишком много попыток входа. Попробуйте через 15 минут.')
}
