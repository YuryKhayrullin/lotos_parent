import './load-env'
import { configuration } from '../lib/server/config'
import { createDatabases } from '../lib/server/database'
import { withCrmRead } from '../lib/server/crm-read'
configuration()
const db = createDatabases()
try {
  await db.parent.user.count()
  const [row] = await db.parent.$queryRaw<
    Array<{ crm: string | null }>
  >`SELECT to_regclass('public.clients')::text AS crm`
  if (row.crm) throw new Error('Identity connection points to CRM')
  await withCrmRead(db, async (client) => {
    await client.query('SELECT id FROM public.clients LIMIT 0')
  })
  console.log('PARENT_ENVIRONMENT_OK')
} finally {
  await db.parent.$disconnect()
  await db.crmPool.end()
}
