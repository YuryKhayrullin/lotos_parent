import { z } from 'zod'

const schema = z.object({
  APP_ENV: z.enum(['local', 'test', 'staging', 'production']),
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  CRM_READ_DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_CA_BASE64: z.string().optional(),
  CRM_DATABASE_CA_BASE64: z.string().optional(),
  VERCEL: z.string().optional(),
  PARENT_PREVIEW: z.string().optional(),
})
export type Configuration = z.infer<typeof schema>
export class ConfigurationError extends Error {}
export function databaseIdentity(value: string) {
  const url = new URL(value)
  const project = url.hostname.endsWith('.pooler.supabase.com')
    ? decodeURIComponent(url.username).split('.').slice(1).join('.')
    : ''
  return [url.hostname, url.port || '5432', url.pathname, project].join('|')
}
export function configuration(values: Record<string, string | undefined> = process.env): Configuration {
  const parsed = schema.safeParse(values)
  if (!parsed.success) throw new ConfigurationError('Required parent application settings are missing')
  const config = parsed.data
  const local = config.APP_ENV === 'local' || config.APP_ENV === 'test'
  const app = new URL(config.APP_URL)
  if ((!local || config.VERCEL === '1') && app.protocol !== 'https:')
    throw new ConfigurationError('HTTPS APP_URL is required')
  if (config.VERCEL === '1' && local)
    throw new ConfigurationError('Local/test profile is forbidden on Vercel')
  if (!local && config.PARENT_PREVIEW === '1') throw new ConfigurationError('Preview is local only')
  if (databaseIdentity(config.DATABASE_URL) === databaseIdentity(config.CRM_READ_DATABASE_URL))
    throw new ConfigurationError('Parent identity and CRM databases must be separate')
  const reader = decodeURIComponent(new URL(config.CRM_READ_DATABASE_URL).username).split('.')[0]
  if (reader !== 'lotos_parent_reader')
    throw new ConfigurationError('Dedicated lotos_parent_reader role is required')
  for (const value of [config.DATABASE_URL, config.CRM_READ_DATABASE_URL]) {
    const url = new URL(value)
    if (!['postgres:', 'postgresql:'].includes(url.protocol))
      throw new ConfigurationError('PostgreSQL URL required')
    if (local && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      throw new ConfigurationError('Local/test databases must be loopback addresses')
    if (!local && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      throw new ConfigurationError('Cloud database must be remote')
  }
  return config
}
export function databaseOptions(
  urlValue: string,
  ca: string | undefined,
  config: Pick<Configuration, 'APP_ENV' | 'VERCEL'>,
) {
  const url = new URL(urlValue)
  for (const key of ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key)
  const local = config.APP_ENV === 'local' || config.APP_ENV === 'test'
  return {
    connectionString: url.toString(),
    ssl: local
      ? (false as const)
      : { rejectUnauthorized: true, ...(ca ? { ca: Buffer.from(ca, 'base64').toString('utf8') } : {}) },
    max: config.VERCEL === '1' ? 1 : 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
    query_timeout: 10000,
  }
}
