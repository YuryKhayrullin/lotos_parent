import { defineConfig } from 'prisma/config'

const schemaOnly =
  ['generate', 'validate', 'format'].includes(process.argv[2] || '') ||
  (process.argv[2] === 'migrate' && process.argv[3] === 'diff')
if (!schemaOnly) {
  if (!process.env.DIRECT_URL) throw new Error('DIRECT_URL of the parent identity database is required')
  if (process.env.DIRECT_URL === process.env.CRM_READ_DATABASE_URL)
    throw new Error('Never migrate the CRM database')
}

const direct = process.env.DIRECT_URL ? new URL(process.env.DIRECT_URL) : null
direct?.searchParams.set('schema', 'parent')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: schemaOnly ? undefined : { url: direct!.toString() },
})
