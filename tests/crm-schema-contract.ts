import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { createDatabases, type Databases } from '../lib/server/database'
import { readChildren, readOverview, parentPayments } from '../lib/server/crm-read'
import { addDays, localDay } from '../lib/contracts'
import { applyMigrations } from '../scripts/migrations'

const name = 'lotos-parent-contract-' + randomUUID().slice(0, 8)
const password = 'local-disposable-test-only'
let server: Pool | undefined
let crm: Pool | undefined
let identity: Pool | undefined
let runtime: Databases | undefined
const root = resolve(process.cwd(), '../lotos_crm/prisma/migrations')
async function ready(pool: Pool) {
  for (let i = 0; i < 100; i++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch {
      await new Promise((done) => setTimeout(done, 200))
    }
  }
  throw new Error('Disposable PostgreSQL did not start')
}
try {
  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '-d',
      '--name',
      name,
      '-e',
      'POSTGRES_PASSWORD=' + password,
      '-p',
      '127.0.0.1::5432',
      'postgres:17-bookworm',
    ],
    { stdio: 'pipe' },
  )
  const port = execFileSync('docker', ['port', name, '5432/tcp'], { encoding: 'utf8' })
    .trim()
    .split(':')
    .at(-1)!
  const url = (user: string, db: string) =>
    'postgresql://' + user + ':' + password + '@127.0.0.1:' + port + '/' + db
  server = new Pool({ connectionString: url('postgres', 'postgres') })
  await ready(server)
  await server.query('CREATE DATABASE crm_contract')
  await server.query('CREATE DATABASE parent_contract')
  crm = new Pool({ connectionString: url('postgres', 'crm_contract') })
  identity = new Pool({ connectionString: url('postgres', 'parent_contract') })
  const migrations = readdirSync(root)
    .filter((item) => /^20\d+_/.test(item))
    .sort()
  assert.equal(migrations.length, 12, 'Contract must cover the complete current CRM schema')
  for (const migration of migrations)
    await crm.query(readFileSync(resolve(root, migration, 'migration.sql'), 'utf8'))
  await crm.query(readFileSync('sql/crm-reader.sql', 'utf8'))
  await crm.query("ALTER ROLE lotos_parent_reader PASSWORD '" + password + "'")
  const connection = await identity.connect()
  try {
    assert.equal(await applyMigrations(connection), 1)
  } finally {
    connection.release()
  }
  await identity.query(readFileSync('sql/parent-runtime.sql', 'utf8'))
  await identity.query("ALTER ROLE lotos_parent_runtime PASSWORD '" + password + "'")

  // These rows use the constraints and relations installed by the actual CRM migrations.
  await crm.query(
    "INSERT INTO branches(id,name,address) VALUES('branch','Тестовый бассейн','Тестовый адрес')",
  )
  await crm.query(
    "INSERT INTO users(id,name,username,role,status,updated_at) VALUES('admin','Администратор','contract-admin','admin','active',now())",
  )
  await crm.query("INSERT INTO coaches(id,branch_id,name) VALUES('coach','branch','Елена Викторовна')")
  await crm.query("INSERT INTO coach_branches(id,coach_id,branch_id) VALUES('membership','coach','branch')")
  await crm.query(`INSERT INTO clients(id,branch_id,child_name,parent_name,birth_date,category,lessons_per_week,status,remaining_lessons,total_lessons,comment,updated_at)
    VALUES('child-a','branch','Мария Соколова','Анна','2018-08-26','synchronized_swimming',2,'active',7,8,'internal note',now()),
      ('child-c','branch','Чужой ребёнок','Другой родитель','2019-06-12','swimming',1,'active',4,4,'private',now())`)
  const today = localDay('Europe/Moscow')
  const lesson = async (
    id: string,
    offset: number,
    status: string,
    enrollment: string,
    mark: string | null,
  ) => {
    const day = addDays(today, offset)
    await crm!.query(
      `INSERT INTO lessons(id,branch_id,coach_id,created_by_id,title,location,category,local_date,time_zone,starts_at,ends_at,status,cancellation_reason,cancelled_at,updated_at)
      VALUES($1,'branch','coach','admin','Синхронное плавание','Бассейн 1','synchronized_swimming',$2,'Europe/Moscow',$3,$4,$5,CASE WHEN $5::\"LessonStatus\"='cancelled' THEN 'Отмена тестового занятия' ELSE NULL END,CASE WHEN $5::\"LessonStatus\"='cancelled' THEN now() ELSE NULL END,now())`,
      [id, day, day + 'T15:30:00Z', day + 'T17:00:00Z', status],
    )
    await crm!.query(
      "INSERT INTO lesson_enrollments(id,lesson_id,client_id,branch_id,status) VALUES($1,$2,'child-a','branch',$3)",
      ['enroll-' + id, id, enrollment],
    )
    if (mark)
      await crm!.query(
        "INSERT INTO attendance(id,enrollment_id,lesson_id,client_id,branch_id,status,updated_at) VALUES($1,$2,$3,'child-a','branch',$4,now())",
        ['mark-' + id, 'enroll-' + id, id, mark],
      )
  }
  await lesson('past-attended', -3, 'completed', 'removed', 'attended')
  await lesson('past-absent', -2, 'completed', 'active', 'absent')
  await lesson('past-unmarked', -1, 'scheduled', 'active', null)
  await lesson('future', 1, 'scheduled', 'active', null)
  await lesson('cancelled', 2, 'cancelled', 'active', null)
  await lesson('removed-future', 3, 'scheduled', 'removed', null)
  const payment = async (id: string, paidAt: string, amount: string) => {
    await crm!.query(
      "INSERT INTO mutation_requests(id,actor_id,request_key,action,fingerprint,result) VALUES($1,'admin',$2,'recordPayment',repeat('a',64),'{}'::jsonb)",
      ['request-' + id, 'key-' + id],
    )
    await crm!.query(
      `INSERT INTO payments(id,client_id,branch_id,request_id,actor_id,amount_minor,category,lessons_per_week,package_price_minor,package_lessons,packages_count,lessons_added,paid_at)
      VALUES($1,'child-a','branch',$2,'admin',$3,'synchronized_swimming',2,800000,8,1,8,$4)`,
      [id, 'request-' + id, amount, paidAt],
    )
  }
  await payment('payment-1', addDays(today, -4) + 'T10:00:00Z', '800000')
  await identity.query(
    "INSERT INTO parent.users(id,name,email,updated_at) VALUES('mom','Анна','mom@example.test',now()),('other','Другой родитель','other@example.test',now())",
  )
  await identity.query(
    "INSERT INTO parent.child_links(id,parent_user_id,crm_client_id,operator_note) VALUES('link-a','mom','child-a','verified'),('link-c','other','child-c','verified')",
  )
  runtime = createDatabases({
    APP_ENV: 'test',
    APP_URL: 'http://127.0.0.1:3100',
    DATABASE_URL: url('lotos_parent_runtime', 'parent_contract'),
    CRM_READ_DATABASE_URL: url('lotos_parent_reader', 'crm_contract'),
    BETTER_AUTH_SECRET: 'disposable-contract-secret-more-than-thirty-two-characters',
  })
  const children = await readChildren(runtime, 'mom')
  assert.deepEqual(
    children.map((item) => item.id),
    ['child-a'],
  )
  assert.equal(children[0].name, 'Мария Соколова')
  let view = await readOverview(runtime, 'mom', 'child-a')
  assert.equal(view.remainingLessons, 7)
  assert.equal(view.attendance.attended, 1)
  assert.equal(view.attendance.absent, 1)
  assert.equal(view.attendance.unmarked, 1)
  assert.equal(view.attendance.percent, 50)
  assert.equal(view.nextLesson?.id, 'future')
  assert.equal(view.history.find((item) => item.id === 'past-attended')?.attendance, 'attended')
  assert.equal(
    view.history.some((item) => item.id === 'cancelled'),
    false,
  )
  assert.equal(view.payments.items[0].amountMinor, '800000')
  assert.equal(JSON.stringify(view).includes('internal note'), false)
  await assert.rejects(
    () => readOverview(runtime!, 'mom', 'child-c'),
    (error: unknown) => (error as { status?: number }).status === 404,
  )
  await assert.rejects(
    () => parentPayments(runtime!, 'other', 'child-a'),
    (error: unknown) => (error as { status?: number }).status === 404,
  )
  await assert.rejects(() => runtime!.crmPool.query('SELECT comment FROM public.clients'), { code: '42501' })
  await assert.rejects(
    () => runtime!.crmPool.query("UPDATE public.clients SET remaining_lessons=100 WHERE id='child-a'"),
    { code: '25006' },
  )
  // A CRM-side payment and cancellation must be visible on the next parent read.
  await crm.query("UPDATE clients SET remaining_lessons=6 WHERE id='child-a'")
  await payment('payment-2', new Date().toISOString(), '400000')
  await crm.query(
    "UPDATE lessons SET status='cancelled',cancellation_reason='Отмена тестового занятия',cancelled_at=now() WHERE id='future'",
  )
  view = await readOverview(runtime, 'mom', 'child-a')
  assert.equal(view.remainingLessons, 6)
  assert.equal(view.nextLesson, null)
  assert.equal(view.payments.items[0].amountMinor, '400000')
  await identity.query("UPDATE parent.child_links SET revoked_at=now() WHERE id='link-a'")
  await assert.rejects(
    () => readOverview(runtime!, 'mom', 'child-a'),
    (error: unknown) => (error as { status?: number }).status === 404,
  )
  console.log(
    'CRM_PARENT_CONTRACT_OK: 12 real CRM migrations, balance, schedule, attendance, payments, isolation, revocation',
  )
} finally {
  await runtime?.parent.$disconnect().catch(() => {})
  await runtime?.crmPool.end().catch(() => {})
  await identity?.end().catch(() => {})
  await crm?.end().catch(() => {})
  await server?.end().catch(() => {})
  execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
}
