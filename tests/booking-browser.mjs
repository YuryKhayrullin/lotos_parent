import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = 'http://127.0.0.1:3191',
  crm = 'http://127.0.0.1:3192'
const at = new Date(Date.now() + 3 * 86400000)
at.setUTCHours(10, 0, 0, 0)
const lesson = {
  id: 'booking-test-lesson',
  title: 'Плавание',
  category: 'swimming',
  localDate: at.toISOString().slice(0, 10),
  startsAt: at.toISOString(),
  endsAt: new Date(+at + 3600000).toISOString(),
  timeZone: 'Europe/Moscow',
  location: 'Основной бассейн',
  capacity: 1,
  coachName: 'Тренер',
  available: 1,
}
let mode = 'new',
  held = false,
  failedReply = false,
  key = '',
  lastPayload = '',
  confirmCount = 0
const hold = () => ({
  token: 'a'.repeat(36) + '.' + 'b'.repeat(64),
  expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
  state: 'held',
  requiresCode: mode === 'new',
  emailStatus: 'sent',
  payment: 'on_site',
})
const server = createServer(async (req, res) => {
  let body = ''
  for await (const c of req) body += c
  const input = body ? JSON.parse(body) : {},
    url = req.url
  function out(data, status = 200) {
    res.statusCode = status
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(data))
  }
  if (url === '/api/parent/booking/catalog')
    return out({
      branches: [{ id: 'test-branch', name: 'Тестовый филиал', address: 'Тестовый адрес', city: 'Москва' }],
    })
  if (url === '/api/parent/booking/branches/test-branch/lessons')
    return out({
      bookingEnabled: true,
      payment: 'on_site',
      lessons: [{ ...lesson, available: held ? 0 : 1 }],
    })
  if (url === '/api/parent/auth/sign-in/email') {
    res.setHeader('set-cookie', 'lotos_parent.session_token=test-only; Path=/; HttpOnly; SameSite=Lax')
    return out({ user: { id: 'parent', name: 'Родитель' } })
  }
  if (url === '/api/parent/children')
    return req.headers.cookie?.includes('test-only')
      ? out({
          parentName: 'Родитель',
          children: [
            {
              id: 'child',
              name: 'Ребёнок',
              birthDate: '2020-01-01',
              branchName: 'Тестовый филиал',
              timeZone: 'Europe/Moscow',
              category: 'swimming',
              lessonsPerWeek: 1,
              status: 'active',
            },
          ],
        })
      : out({ error: 'Войдите' }, 401)
  if (url === '/api/parent/booking/hold') {
    if (key) {
      assert.equal(input.requestId, key)
      assert.equal(body, lastPayload)
    } else {
      key = input.requestId
      lastPayload = body
    }
    held = true
    if (mode === 'new' && !failedReply) {
      failedReply = true
      return out({ error: 'Ответ потерян. Повторите проверку.' }, 502)
    }
    return out(hold())
  }
  if (url === '/api/parent/booking/status') return out(hold())
  if (url === '/api/parent/booking/cancel') {
    held = false
    return out({ success: true })
  }
  if (url === '/api/parent/booking/confirm') {
    confirmCount++
    if (mode === 'new' && input.code !== '123456') return out({ error: 'Неверный код' }, 400)
    return out({ success: true, state: 'confirmed' })
  }
  return out({ error: 'Не найдено' }, 404)
})
await new Promise((r) => server.listen(3192, '127.0.0.1', r))
const env = {
  ...process.env,
  APP_ENV: 'test',
  APP_URL: app,
  CRM_API_URL: crm,
  CRM_GATEWAY_SECRET: randomBytes(32).toString('hex'),
  PLAYWRIGHT_BROWSERS_PATH: path.join(root, '../lotos_crm/.tools/playwright'),
}
delete env.VERCEL
delete env.LOCAL_CRM_API
process.env.PLAYWRIGHT_BROWSERS_PATH = env.PLAYWRIGHT_BROWSERS_PATH
let log = '',
  browser
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--port', '3191', '--hostname', '127.0.0.1'],
  { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] },
)
child.stdout.on('data', (d) => {
  log = (log + d).slice(-3000)
})
child.stderr.on('data', (d) => {
  log = (log + d).slice(-3000)
})
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(app + '/book/test-branch?service=group')).ok) break
    } catch {}
    if (i === 99) throw Error('Parent test server failed: ' + log)
    await new Promise((r) => setTimeout(r, 200))
  }
  const { chromium } = await import('@playwright/test')
  browser = await chromium.launch({ headless: true })
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } }),
      page = await context.newPage(),
      errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    held = false
    key = ''
    lastPayload = ''
    failedReply = false
    mode = width === 390 ? 'family' : 'new'
    await page.goto(app + '/book/test-branch?service=group')
    await page.getByRole('button', { name: 'Понятно', exact: true }).click()
    await page.getByRole('button', { name: 'Записаться · оплата на месте', exact: true }).click()
    if (mode === 'family') {
      await page.getByRole('button', { name: 'Уже есть кабинет', exact: true }).click()
      await page.getByLabel('Email', { exact: true }).fill('test@example.test')
      await page.getByLabel('Пароль', { exact: true }).fill('Existing-test-password')
      await page.getByRole('button', { name: 'Войти и выбрать ребёнка' }).click()
      await page.waitForFunction(
        () =>
          document.querySelector('select[name=clientId]') ||
          [...document.querySelectorAll('[role=alert]')].some((e) => e.textContent.trim()),
      )
      if (await page.getByRole('alert').filter({ hasText: /\\S/ }).count())
        throw Error(await page.getByRole('alert').filter({ hasText: /\\S/ }).innerText())
      await page.locator('select[name="clientId"]').selectOption('child')
      await page.getByRole('checkbox').check()
      await page.getByRole('button', { name: 'Забронировать место', exact: true }).click()
    } else {
      await page.getByLabel('Ваше имя', { exact: true }).fill('Тестовый родитель')
      await page.getByLabel('Имя ребёнка', { exact: true }).fill('Тестовый ребёнок')
      await page.getByLabel('Дата рождения ребёнка', { exact: true }).fill('2020-01-01')
      await page.getByLabel('Телефон', { exact: true }).fill('+79990000000')
      await page.getByLabel('Email для кода и кабинета', { exact: true }).fill('test@example.test')
      await page.getByRole('checkbox').check()
      await page.getByRole('button', { name: 'Получить код и забронировать' }).click()
      await page.getByRole('button', { name: 'Проверить результат той же записи' }).click()
      await page.getByLabel('Код из письма', { exact: true }).waitFor()
      await page.reload()
      await page.getByLabel('Код из письма', { exact: true }).fill('000000')
      await page.getByLabel('Создайте пароль кабинета', { exact: false }).fill('New-parent-test-password')
      await page.getByRole('button', { name: 'Подтвердить запись · оплата на месте' }).click()
      await page.getByRole('alert').filter({ hasText: 'Неверный код' }).waitFor()
      await page.getByLabel('Код из письма', { exact: true }).fill('123456')
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    assert.equal(overflow, false, 'Overflow at ' + width)
    if (width === 320) await page.screenshot({ path: '/tmp/lotos-booking-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Подтвердить запись · оплата на месте' }).click()
    await page.getByRole('heading', { name: 'Вы записаны', exact: true }).waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    console.log('Booking browser passed: ' + width + 'px; ' + mode)
  }
  const denied = await fetch(app + '/api/parent/booking/hold', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://foreign.invalid' },
    body: '{}',
  })
  assert.equal(denied.status, 403)
  assert.ok(confirmCount >= 5)
  console.log('Cross-origin POST rejected; retry key and last-seat reload verified')
} finally {
  await browser?.close()
  child.kill('SIGTERM')
  await new Promise((r) => server.close(r))
}
