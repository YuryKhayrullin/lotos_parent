import { createHash } from 'node:crypto'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../.generated/prisma/client'
import { attachDatabasePool } from '@vercel/functions'
import { configuration, databaseOptions } from './config'

export function createDatabases(values: Record<string, string | undefined> = process.env) {
  const config = configuration(values)
  const parentPool = new Pool(databaseOptions(config.DATABASE_URL, config.DATABASE_CA_BASE64, config))
  const crmPool = new Pool(
    databaseOptions(config.CRM_READ_DATABASE_URL, config.CRM_DATABASE_CA_BASE64, config),
  )
  parentPool.on('error', () => console.error('parent-pool-error'))
  crmPool.on('error', () => console.error('crm-read-pool-error'))
  if (config.VERCEL === '1') {
    attachDatabasePool(parentPool)
    attachDatabasePool(crmPool)
  }
  const parent = new PrismaClient({
    adapter: new PrismaPg(parentPool, { disposeExternalPool: true }),
    transactionOptions: { maxWait: 5000, timeout: 10000 },
  })
  return { parent, crmPool, config, parentPool }
}
export type Databases = ReturnType<typeof createDatabases>
const cache = globalThis as typeof globalThis & {
  parentRuntime?: { fingerprint: string; databases: Databases }
}
export function databases() {
  const config = configuration()
  const fingerprint = createHash('sha256').update(JSON.stringify(config)).digest('hex')
  if (cache.parentRuntime) {
    if (cache.parentRuntime.fingerprint !== fingerprint)
      throw new Error('Configuration changed; restart server')
    return cache.parentRuntime.databases
  }
  const value = createDatabases()
  cache.parentRuntime = { fingerprint, databases: value }
  return value
}
