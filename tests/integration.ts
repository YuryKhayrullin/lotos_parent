import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { Pool } from 'pg'
import { chromium } from '@playwright/test'
import { hashPassword } from 'better-auth/crypto'
import { createDatabases, type Databases } from '../lib/server/database'
import { addDays, localDay, dateLabel } from '../lib/contracts'

const name = 'lotos-parent-test-' + randomUUID().slice(0, 8)
const password = 'local-disposable-test-only'
let server: ChildProcess | undefined, operator: Databases | undefined
let admin: Pool | undefined, parentAdmin: Pool | undefined, crmAdmin: Pool | undefined
async function waitFor(work: () => Promise<boolean>, label: string) {
  for (let i = 0; i < 100; i++) {
    if (await work().catch(() => false)) return
    await new Promise((done) => setTimeout(done, 200))
  }
  throw new Error(label + ' did not become ready')
}
async function freePort() {
  const socket = createServer()
  await new Promise<void>((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const value = (socket.address() as { port: number }).port
  await new Promise<void>((resolve) => socket.close(() => resolve()))
  return value
}
try {
  if (!existsSync('.next/BUILD_ID')) throw new Error('Run npm run build first')
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
  admin = new Pool({ connectionString: url('postgres', 'postgres') })
  await waitFor(async () => {
    await admin!.query('SELECT 1')
    return true
  }, 'PostgreSQL')
  await admin.query('CREATE DATABASE parent_test')
  await admin.query('CREATE DATABASE crm_test')
  parentAdmin = new Pool({ connectionString: url('postgres', 'parent_test') })
  crmAdmin = new Pool({ connectionString: url('postgres', 'crm_test') })
  const migrateEnv = { ...process.env, APP_ENV: 'test', DIRECT_URL: url('postgres', 'parent_test') }
  const runMigrations = () =>
    execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/migrate.ts'], {
      env: migrateEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  assert.match(runMigrations(), /PARENT_MIGRATIONS_COMMITTED: 1/)
  assert.match(runMigrations(), /PARENT_MIGRATIONS_COMMITTED: 1/)
  assert.equal(
    (await parentAdmin.query('SELECT count(*)::int AS count FROM parent._prisma_migrations')).rows[0].count,
    1,
  )
  await parentAdmin.query("UPDATE parent._prisma_migrations SET checksum=repeat('0',64)")
  assert.throws(runMigrations)
  await parentAdmin.query('UPDATE parent._prisma_migrations SET checksum=$1', [
    createHash('sha256')
      .update(readFileSync('prisma/migrations/202610140001_parent_identity/migration.sql'))
      .digest('hex'),
  ])
  await parentAdmin.query(readFileSync('sql/parent-runtime.sql', 'utf8'))
  await parentAdmin.query("ALTER ROLE lotos_parent_runtime PASSWORD '" + password + "'")
  await crmAdmin.query(`
    CREATE TABLE branches(id text PRIMARY KEY,name text,time_zone text);
    CREATE TABLE coaches(id text PRIMARY KEY,name text);
    CREATE TABLE clients(id text PRIMARY KEY,branch_id text,child_name text,birth_date date,category text,lessons_per_week int,status text,remaining_lessons int,comment text);
    CREATE TABLE lessons(id text PRIMARY KEY,branch_id text,coach_id text,title text,local_date date,starts_at timestamptz,ends_at timestamptz,time_zone text,location text,status text);
    CREATE TABLE lesson_enrollments(id text PRIMARY KEY,lesson_id text,client_id text,branch_id text,status text);
    CREATE TABLE attendance(id text PRIMARY KEY,lesson_id text,client_id text,branch_id text,status text);
    CREATE TABLE payments(id text PRIMARY KEY,client_id text,paid_at timestamptz,amount_minor bigint,lessons_added int,package_lessons int);
    INSERT INTO branches VALUES ('branch','Тестовый бассейн','Europe/Moscow');
    INSERT INTO coaches VALUES ('coach','Елена Викторовна');
    INSERT INTO clients VALUES ('child-a','branch','Мария Соколова','2018-08-26','synchronized_swimming',2,'active',7,'internal'),
      ('child-b','branch','Петя Соколов','2020-06-12','swimming',1,'active',0,'internal'),
      ('child-c','branch','Чужой ребёнок','2019-06-12','swimming',1,'active',4,'internal');
  `)
  await crmAdmin.query(readFileSync('sql/crm-reader.sql', 'utf8'))
  await crmAdmin.query("ALTER ROLE lotos_parent_reader PASSWORD '" + password + "'")
  const today = localDay('Europe/Moscow')
  const seedLesson = async (
    id: string,
    offset: number,
    status: string,
    enrollment: string,
    attendance: string | null,
  ) => {
    const day = addDays(today, offset)
    await crmAdmin!.query('INSERT INTO lessons VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [
      id,
      'branch',
      'coach',
      'Синхронное плавание',
      day,
      day + 'T15:30:00Z',
      day + 'T17:00:00Z',
      'Europe/Moscow',
      'Бассейн 1',
      status,
    ])
    await crmAdmin!.query('INSERT INTO lesson_enrollments VALUES ($1,$2,$3,$4,$5)', [
      'enroll-' + id,
      id,
      'child-a',
      'branch',
      enrollment,
    ])
    if (attendance)
      await crmAdmin!.query('INSERT INTO attendance VALUES ($1,$2,$3,$4,$5)', [
        'mark-' + id,
        id,
        'child-a',
        'branch',
        attendance,
      ])
  }
  await seedLesson('past-attended', -3, 'completed', 'removed', 'attended')
  await seedLesson('past-absent', -2, 'completed', 'active', 'absent')
  await seedLesson('past-unmarked', -1, 'scheduled', 'active', null)
  await seedLesson('future', 1, 'scheduled', 'active', null)
  await seedLesson('cancelled', 2, 'cancelled', 'active', null)
  await seedLesson('removed-future', 3, 'scheduled', 'removed', null)
  for (let i = 0; i < 23; i++)
    await crmAdmin.query('INSERT INTO payments VALUES ($1,$2,$3,$4,$5,$6)', [
      'payment-' + i,
      'child-a',
      addDays(today, -i) + 'T10:00:00Z',
      '800000',
      8,
      8,
    ])

  // Migration refuses a CRM database before creating any parent schema.
  await assert.rejects(() =>
    crmAdmin!.query(readFileSync('prisma/migrations/202610140001_parent_identity/migration.sql', 'utf8')),
  )
  await crmAdmin.query('ROLLBACK')
  assert.equal((await crmAdmin.query("SELECT to_regnamespace('parent') AS schema")).rows[0].schema, null)

  const appPort = await freePort()
  const env = {
    ...process.env,
    APP_ENV: 'test',
    APP_URL: 'http://127.0.0.1:' + appPort,
    DATABASE_URL: url('lotos_parent_runtime', 'parent_test'),
    DIRECT_URL: url('postgres', 'parent_test'),
    CRM_READ_DATABASE_URL: url('lotos_parent_reader', 'crm_test'),
    BETTER_AUTH_SECRET: 'disposable-parent-test-secret-more-than-thirty-two-characters',
    VERCEL: '',
  }
  operator = createDatabases({ ...env, DATABASE_URL: env.DIRECT_URL })
  const hash = await hashPassword('Parent-local-test-2026')
  for (const [id, email, nameValue] of [
    ['mom', 'mom@example.test', 'Анна'],
    ['other', 'other@example.test', 'Другой родитель'],
    ['empty', 'empty@example.test', 'Без детей'],
  ]) {
    await operator.parent.user.create({ data: { id, email, name: nameValue } })
    await operator.parent.account.create({
      data: { id: 'account-' + id, userId: id, accountId: id, providerId: 'credential', password: hash },
    })
  }
  for (const [user, child] of [
    ['mom', 'child-a'],
    ['mom', 'child-b'],
    ['other', 'child-c'],
  ])
    await operator.parent.parentChildLink.create({
      data: { parentUserId: user, crmClientId: child, operatorNote: 'test verified parent' },
    })
  let serverLog = ''
  server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(appPort)],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  server.stdout?.on('data', (chunk) => {
    serverLog = (serverLog + chunk).slice(-4000)
  })
  server.stderr?.on('data', (chunk) => {
    serverLog = (serverLog + chunk).slice(-4000)
  })
  const base = env.APP_URL
  await waitFor(async () => (await fetch(base + '/api/health')).ok, 'Next server (' + serverLog + ')')
  const get = (path: string, cookie = '') => fetch(base + path, { headers: { cookie } })
  const login = (email: string, pw = 'Parent-local-test-2026', origin = base) =>
    fetch(base + '/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin },
      body: JSON.stringify({ email, password: pw }),
    })
  assert.equal((await get('/api/parent/children')).status, 401)
  assert.equal((await fetch(base + '/api/auth/sign-up/email', { method: 'POST' })).status, 404)
  assert.equal((await get('/preview')).status, 404)
  assert.equal((await login('mom@example.test', undefined, 'https://foreign.example')).status, 403)
  const signed = await login('mom@example.test')
  assert.equal(signed.status, 200)
  const loginData = await signed.json()
  assert.equal(loginData.token, undefined)
  const cookie = signed.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  assert.ok(cookie.includes('lotos_parent'))
  const originalSession = await operator.parent.session.findFirstOrThrow({ where: { userId: 'mom' } })
  const children = await (await get('/api/parent/children', cookie)).json()
  assert.deepEqual(children.children.map((child: { id: string }) => child.id).sort(), ['child-a', 'child-b'])
  const response = await get('/api/parent/children/child-a/overview', cookie)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  const overview = await response.json()
  assert.equal(overview.remainingLessons, 7)
  assert.equal(overview.attendance.percent, 50)
  assert.equal(overview.attendance.unmarked, 1)
  assert.equal(overview.nextLesson.id, 'future')
  assert.equal(
    overview.history.find((item: { id: string }) => item.id === 'past-attended').attendance,
    'attended',
  )
  assert.equal(overview.payments.items.length, 20)
  assert.equal(JSON.stringify(overview).includes('internal'), false)
  assert.equal((await get('/api/parent/children/child-c/overview', cookie)).status, 404)
  assert.equal((await get('/api/parent/children/missing/overview', cookie)).status, 404)
  assert.equal((await get('/api/parent/children/child-a/overview?week=2026-02-30', cookie)).status, 400)
  const nextPage = await (
    await get(
      '/api/parent/children/child-a/payments?cursor=' + encodeURIComponent(overview.payments.nextCursor),
      cookie,
    )
  ).json()
  assert.equal(nextPage.items.length, 3)
  assert.equal(nextPage.nextCursor, null)
  assert.equal(
    new Set([...overview.payments.items, ...nextPage.items].map((item: { id: string }) => item.id)).size,
    23,
  )

  // Real browser login, pages, pagination, child switching, mobile and dialog.
  if (process.env.PARENT_TEST_SKIP_BROWSER === '1') {
    console.log('PARENT_BROWSER_SKIPPED: Chromium is unavailable; HTTP and database checks continue')
  } else {
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      await page.goto(base)
      await page.getByLabel('Email', { exact: true }).fill('mom@example.test')
      await page.getByLabel('Пароль', { exact: true }).fill('Parent-local-test-2026')
      await page.getByRole('button', { name: 'Открыть кабинет' }).click()
      await page.getByText('Мария Соколова', { exact: false }).first().waitFor()
      await page.getByText('50%', { exact: true }).waitFor()
      mkdirSync('.private/test-artifacts', { recursive: true })
      await page.screenshot({ path: '.private/test-artifacts/desktop.png', fullPage: true })
      await page.getByText('Ближайшая тренировка', { exact: true }).click()
      await page.getByRole('dialog').waitFor()
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('dialog').count(), 0)
      await page.getByRole('button', { name: dateLabel(addDays(today, 1), true), exact: true }).click()
      await page.getByText('По расписанию', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Следующая неделя', exact: true }).click()
      await page.getByText('В этот день занятий нет', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Главная', exact: true }).first().click()
      await page.getByRole('heading', { name: 'Эта неделя', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Посещаемость', exact: true }).first().click()
      await page.getByRole('heading', { name: 'История занятий', exact: true }).waitFor()
      assert.equal(await page.getByText('Был', { exact: true }).count(), 1)
      assert.equal(await page.getByText('Не был', { exact: true }).count(), 1)
      await page.getByRole('button', { name: 'Абонемент', exact: true }).first().click()
      await page.getByRole('button', { name: 'Показать ещё', exact: true }).click()
      await waitFor(
        async () => (await page.getByText('Начислено занятий: 8', { exact: true }).count()) === 23,
        'Payment pagination',
      )
      await page.getByLabel('Выбрать ребёнка').selectOption('child-b')
      await page.getByText('Истории оплат пока нет', { exact: true }).waitFor()
      assert.equal(await page.getByText('7', { exact: true }).count(), 0)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.getByRole('button', { name: 'Главная', exact: true }).last().click()
      await page.getByText('Пока не назначена', { exact: true }).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await page.screenshot({ path: '.private/test-artifacts/mobile-empty.png', fullPage: true })
      await page.route('**/api/parent/**', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Временно недоступно' }),
        }),
      )
      await page.getByRole('button', { name: 'Обновить данные', exact: true }).click()
      await page.getByRole('heading', { name: 'Не удалось загрузить данные', exact: true }).waitFor()
      await page.unroute('**/api/parent/**')
      await page.getByRole('button', { name: 'Повторить', exact: true }).click()
      await page.getByText('Пока не назначена', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Выйти из кабинета', exact: true }).click()
      await page.getByRole('heading', { name: 'Войдите в кабинет', exact: true }).waitFor()
      assert.deepEqual(pageErrors, [])
    } finally {
      await browser.close()
    }
  }

  await crmAdmin.query("UPDATE clients SET remaining_lessons=6 WHERE id='child-a'")
  assert.equal(
    (await (await get('/api/parent/children/child-a/overview', cookie)).json()).remainingLessons,
    6,
  )
  await operator.parent.session.updateMany({
    where: { userId: 'mom' },
    data: { expiresAt: new Date(Date.now() + 3600000), updatedAt: new Date(Date.now() - 7200000) },
  })
  const refreshed = await get('/api/parent/children', cookie)
  assert.ok(refreshed.headers.getSetCookie().length > 0)
  assert.ok(
    (await operator.parent.session.findUnique({ where: { id: originalSession.id } }))!.expiresAt.getTime() >
      Date.now() + 86400000,
  )
  await operator.parent.parentChildLink.updateMany({
    where: { parentUserId: 'mom', crmClientId: 'child-b' },
    data: { revokedAt: new Date() },
  })
  assert.equal((await get('/api/parent/children/child-b/overview', cookie)).status, 404)
  assert.equal((await (await get('/api/parent/children', cookie)).json()).children.length, 1)
  await assert.rejects(() => operator!.crmPool.query('SELECT comment FROM public.clients'), { code: '42501' })
  const reader = await operator.crmPool.connect()
  try {
    await reader.query('SET default_transaction_read_only=off')
    await assert.rejects(() => reader.query('UPDATE public.clients SET remaining_lessons=999'), {
      code: '42501',
    })
  } finally {
    reader.release()
  }
  const attempts = await Promise.all(
    Array.from({ length: 13 }, () => login('locked@example.test', 'wrong-password')),
  )
  assert.equal(attempts.filter((result) => result.status === 429).length, 1)
  const otherSigned = await login('other@example.test')
  const otherCookie = otherSigned.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  assert.deepEqual(
    (await (await get('/api/parent/children', otherCookie)).json()).children.map(
      (child: { id: string }) => child.id,
    ),
    ['child-c'],
  )
  assert.equal((await get('/api/parent/children/child-a/payments', otherCookie)).status, 404)
  const emptySigned = await login('empty@example.test')
  const emptyCookie = emptySigned.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  assert.deepEqual((await (await get('/api/parent/children', emptyCookie)).json()).children, [])
  // Operator workflow uses its CLI and a separate identity database.
  const managedEmail = 'managed@example.test'
  const operatorEnv = {
    ...env,
    PARENT_EMAIL: managedEmail,
    PARENT_NAME: 'Управляемый родитель',
    PARENT_PASSWORD: 'Manage-local-test-2026',
    CRM_CLIENT_ID: 'child-b',
    OPERATOR_NOTE: 'Confirmed by local integration operator',
  }
  const manage = (action: string, extra: Record<string, string> = {}) =>
    execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/manage-parent.ts', action], {
      env: { ...operatorEnv, ...extra },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  assert.match(manage('create'), /PARENT_OPERATION_COMMITTED: create/)
  const managed = await login(managedEmail, operatorEnv.PARENT_PASSWORD)
  assert.equal(managed.status, 200)
  const managedCookie = managed.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  assert.equal((await get('/api/parent/children/child-b/overview', managedCookie)).status, 200)
  assert.match(manage('revoke'), /PARENT_OPERATION_COMMITTED: revoke/)
  assert.equal((await get('/api/parent/children/child-b/overview', managedCookie)).status, 404)
  assert.match(manage('link'), /PARENT_OPERATION_COMMITTED: link/)
  assert.equal((await get('/api/parent/children/child-b/overview', managedCookie)).status, 200)
  assert.match(
    manage('password', { PARENT_PASSWORD: 'Manage-new-test-2026' }),
    /PARENT_OPERATION_COMMITTED: password/,
  )
  assert.equal((await get('/api/parent/children', managedCookie)).status, 401)
  assert.equal((await login(managedEmail, 'Manage-new-test-2026')).status, 200)
  assert.match(manage('disable'), /PARENT_OPERATION_COMMITTED: disable/)
  assert.equal((await login(managedEmail, 'Manage-new-test-2026')).status, 401)
  await operator.parent.user.update({ where: { id: 'mom' }, data: { enabled: false } })
  assert.equal((await get('/api/parent/children', cookie)).status, 401)
  console.log(
    `INTEGRATION_OK: migrations, auth, operator provisioning, SQL read-only, parent isolation, revocation, session refresh, live CRM reads, pagination${process.env.PARENT_TEST_SKIP_BROWSER === '1' ? ' (browser skipped)' : ', desktop/mobile browser'}`,
  )
} finally {
  server?.kill('SIGTERM')
  await operator?.parent.$disconnect().catch(() => {})
  await operator?.crmPool.end().catch(() => {})
  await parentAdmin?.end().catch(() => {})
  await crmAdmin?.end().catch(() => {})
  await admin?.end().catch(() => {})
  execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
}
