import 'server-only'
import { databases } from '@/lib/server/database'
import { withCrmRead } from '@/lib/server/crm-read'
import { json } from '@/lib/server/errors'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const db = databases()
    await db.parent.$queryRaw`SELECT 1`
    await withCrmRead(db, async (connection) => {
      await connection.query('SELECT 1')
    })
    return json({ status: 'ok' })
  } catch {
    return json({ status: 'unavailable' }, 503)
  }
}
