import './load-env'
import { Client } from 'pg'
import { z } from 'zod'
import { databaseOptions } from '../lib/server/config'
import { applyMigrations } from './migrations'
const profile = z.enum(['local', 'test', 'staging', 'production']).parse(process.env.APP_ENV)
const directUrl = z.string().url().parse(process.env.DIRECT_URL)
const url = new URL(directUrl)
if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL DIRECT_URL required')
if (['local', 'test'].includes(profile) && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  throw new Error('Local migrations require loopback database')
const connection = new Client(
  databaseOptions(directUrl, process.env.DATABASE_CA_BASE64, {
    APP_ENV: profile,
    VERCEL: process.env.VERCEL,
  }),
)
try {
  await connection.connect()
  const count = await applyMigrations(connection)
  console.log('PARENT_MIGRATIONS_COMMITTED: ' + count)
} finally {
  await connection.end()
}
