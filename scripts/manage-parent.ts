import './load-env'
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { z } from 'zod'
import { createDatabases } from '../lib/server/database'
import { withCrmRead } from '../lib/server/crm-read'
import { databaseIdentity } from '../lib/server/config'

const action = z.enum(['create', 'link', 'revoke', 'disable', 'password']).parse(process.argv[2])
const email = z.email().max(254).parse(process.env.PARENT_EMAIL?.trim().toLowerCase())
const note = z.string().min(3).max(500).parse(process.env.OPERATOR_NOTE)
if (!process.env.DIRECT_URL) throw new Error('DIRECT_URL of the parent identity database is required')
const runtime = createDatabases({ ...process.env, DATABASE_URL: process.env.DIRECT_URL })
if (databaseIdentity(process.env.DIRECT_URL) === databaseIdentity(process.env.CRM_READ_DATABASE_URL!))
  throw new Error('Never provision accounts in CRM')
try {
  const [sentinel] = await runtime.parent.$queryRaw<
    Array<{ crm: string | null }>
  >`SELECT to_regclass('public.clients')::text AS crm`
  if (sentinel.crm) throw new Error('Wrong database: CRM connection')
  let clientId: string | undefined
  if (['create', 'link', 'revoke'].includes(action)) {
    clientId = z.string().min(1).max(100).parse(process.env.CRM_CLIENT_ID)
    if (action !== 'revoke')
      await withCrmRead(runtime, async (db) => {
        const result = await db.query('SELECT id FROM public.clients WHERE id=$1', [clientId])
        if (!result.rowCount) throw new Error('CRM client does not exist')
      })
  }
  const user = await runtime.parent.user.findUnique({ where: { email } })
  if (action === 'create') {
    if (user) throw new Error('Account already exists; use link or password explicitly')
    const password = z.string().min(12).max(200).parse(process.env.PARENT_PASSWORD)
    const name = z.string().min(1).max(150).parse(process.env.PARENT_NAME)
    const id = randomUUID(),
      hash = await hashPassword(password)
    await runtime.parent.$transaction(async (tx) => {
      await tx.user.create({ data: { id, email, name, emailVerified: false } })
      await tx.account.create({
        data: { id: randomUUID(), userId: id, accountId: id, providerId: 'credential', password: hash },
      })
      await tx.parentChildLink.create({
        data: { parentUserId: id, crmClientId: clientId!, operatorNote: note },
      })
    })
  } else {
    if (!user) throw new Error('Parent account does not exist')
    if (action === 'link')
      await runtime.parent.parentChildLink.upsert({
        where: { parentUserId_crmClientId: { parentUserId: user.id, crmClientId: clientId! } },
        create: { parentUserId: user.id, crmClientId: clientId!, operatorNote: note },
        update: { revokedAt: null, operatorNote: note },
      })
    if (action === 'revoke')
      await runtime.parent.parentChildLink.update({
        where: { parentUserId_crmClientId: { parentUserId: user.id, crmClientId: clientId! } },
        data: { revokedAt: new Date(), operatorNote: note },
      })
    if (action === 'disable')
      await runtime.parent.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { enabled: false } })
        await tx.session.deleteMany({ where: { userId: user.id } })
      })
    if (action === 'password') {
      const hash = await hashPassword(z.string().min(12).max(200).parse(process.env.PARENT_PASSWORD))
      await runtime.parent.$transaction(async (tx) => {
        await tx.account.updateMany({
          where: { userId: user.id, providerId: 'credential' },
          data: { password: hash },
        })
        await tx.session.deleteMany({ where: { userId: user.id } })
      })
    }
  }
  console.log('PARENT_OPERATION_COMMITTED:', action)
} finally {
  await runtime.parent.$disconnect()
  await runtime.crmPool.end()
}
