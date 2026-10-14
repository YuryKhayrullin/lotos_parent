import { createHash, randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Client, PoolClient } from 'pg'

export async function applyMigrations(connection: Client | PoolClient, directory = 'prisma/migrations') {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((item) => item.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
  if (!entries.length) throw new Error('No parent migrations found')
  const migrations = await Promise.all(
    entries.map(async (entry) => {
      const sql = await readFile(join(directory, entry.name, 'migration.sql'), 'utf8')
      if (!sql.trim()) throw new Error('Empty migration: ' + entry.name)
      return { name: entry.name, sql, checksum: createHash('sha256').update(sql).digest('hex') }
    }),
  )
  await connection.query('BEGIN')
  try {
    await connection.query("SET LOCAL statement_timeout='60s'")
    await connection.query("SET LOCAL lock_timeout='10s'")
    await connection.query('SELECT pg_advisory_xact_lock(72707414)')
    const {
      rows: [sentinel],
    } = await connection.query(
      "SELECT to_regclass('public.clients') AS clients,to_regclass('public.lessons') AS lessons",
    )
    if (sentinel.clients || sentinel.lessons) throw new Error('Refusing to migrate a CRM database')
    await connection.query('CREATE SCHEMA IF NOT EXISTS parent')
    await connection.query('REVOKE ALL ON SCHEMA parent FROM PUBLIC')
    await connection.query(`CREATE TABLE IF NOT EXISTS parent._prisma_migrations (
      id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ,
      migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0
    )`)
    const { rows: history } = await connection.query('SELECT * FROM parent._prisma_migrations')
    for (const receipt of history) {
      const migration = migrations.find((item) => item.name === receipt.migration_name)
      if (
        !migration ||
        migration.checksum !== receipt.checksum ||
        !receipt.finished_at ||
        receipt.rolled_back_at
      )
        throw new Error('Unexpected or incomplete migration history: ' + receipt.migration_name)
    }
    for (const migration of migrations) {
      if (history.some((receipt) => receipt.migration_name === migration.name)) continue
      await connection.query(migration.sql)
      await connection.query(
        'INSERT INTO parent._prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count) VALUES($1,$2,$3,now(),1)',
        [randomUUID(), migration.checksum, migration.name],
      )
    }
    for (const table of ['users', 'sessions', 'accounts', 'verifications', 'child_links', 'rate_buckets']) {
      const {
        rows: [result],
      } = await connection.query('SELECT to_regclass($1) AS relation', ['parent.' + table])
      if (!result.relation) throw new Error('Required parent table missing: ' + table)
    }
    await connection.query('COMMIT')
    return migrations.length
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  }
}
