import { z } from 'zod'

const schema = z.object({
  APP_ENV: z.enum(['local', 'test', 'staging', 'production']),
  APP_URL: z.string().url(),
  CRM_API_URL: z.string().url(),
  CRM_GATEWAY_SECRET: z.string().regex(/^[0-9a-f]{64}$/),
  VERCEL: z.string().optional(),
  LOCAL_CRM_API: z.enum(['0', '1']).optional(),
})
export type Configuration = z.infer<typeof schema>
export class ConfigurationError extends Error {}
export function configuration(values: Record<string, string | undefined> = process.env): Configuration {
  const parsed = schema.safeParse(values)
  if (!parsed.success)
    throw new ConfigurationError(
      'Invalid or missing parent settings: ' +
        [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].join(', '),
    )
  const config = parsed.data
  const local = ['local', 'test'].includes(config.APP_ENV)
  const app = new URL(config.APP_URL),
    crm = new URL(config.CRM_API_URL)
  const loopback = (url: URL) => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  for (const url of [app, crm]) {
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      !['http:', 'https:'].includes(url.protocol)
    )
      throw new ConfigurationError('Application settings must be plain HTTP(S) origins')
    if ((!local || config.VERCEL === '1') && (url.protocol !== 'https:' || loopback(url)))
      throw new ConfigurationError('Cloud applications require remote HTTPS origins')
  }
  if (app.origin === crm.origin) throw new ConfigurationError('CRM and Parent must use different origins')
  if (local && config.VERCEL === '1') throw new ConfigurationError('Local profile is forbidden on Vercel')
  if (local && !loopback(app)) throw new ConfigurationError('Local parent app must use loopback')
  if (local && !loopback(crm) && config.LOCAL_CRM_API !== '1')
    throw new ConfigurationError('Remote CRM API requires explicit LOCAL_CRM_API=1')
  if (!local && config.LOCAL_CRM_API === '1') throw new ConfigurationError('LOCAL_CRM_API is local/test only')
  return config
}
