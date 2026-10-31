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
  confirmCount = 0,
  mailStatus = 'sent',
  mailAttempts = 1,
  resendCount = 0
const diagnosticEvents = []
const hold = () => ({
  token: 'a'.repeat(36) + '.' + 'b'.repeat(64),
  expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
  state: 'held',
  requiresCode: mode === 'new',
  emailStatus: mode === 'new' ? mailStatus : 'not_required',
  emailAttempts: mode === 'new' ? mailAttempts : 0,
  canResendAt: mode === 'new' && mailStatus !== 'sent' ? new Date(Date.now() - 1000).toISOString() : null,
  payment: 'on_site',
})
const nextWeek = new Date(+at + 7 * 86400000)
const publicOffer = {
  category: 'swimming',
  title: 'Плавание',
  published: true,
  trialPriceMinor: '150000',
  currency: 'RUB',
  minAgeMonths: 60,
  maxAgeMonths: 143,
  conditions: 'Первое занятие. Оплата на месте.',
}
const publicBranch = {
  id: 'test-branch',
  name: 'Тестовый филиал',
  address: 'Тестовый адрес',
  city: 'Москва',
  timeZone: 'Europe/Moscow',
  metro: 'Жулебино',
  photoUrl: null,
  arrivalText: 'Вход со двора',
  bookingEnabled: true,
  offers: [publicOffer, { ...publicOffer, category: 'synchronized_swimming', title: 'Синхронное плавание' }],
}
const secondBranch = {
  ...publicBranch,
  id: 'second-branch',
  name: 'Второй бассейн с длинным названием',
  metro: 'Никулина',
  address: 'Очень длинный адрес бассейна, улица Проверочная, дом 10, корпус 15, вход со двора',
}
let calendarFailures = 0
function publicRange(from, to) {
  const today = new Date().toISOString().slice(0, 10),
    until = new Date(Date.now() + 28 * 86400000)
  const last = until.toISOString().slice(0, 10),
    start = from > today ? from : today,
    end = to < last ? to : last
  return {
    bookableRange: { from: today, to: last, until: until.toISOString() },
    coveredRange: start <= end ? { from: start, to: end } : null,
  }
}
function publicLessons(branchId, category) {
  if (branchId === 'second-branch') return []
  const swim = { ...lesson, branchId, publicOffer, available: held ? 0 : 1 }
  const future = {
    ...swim,
    id: 'future-lesson',
    localDate: nextWeek.toISOString().slice(0, 10),
    startsAt: nextWeek.toISOString(),
    endsAt: new Date(+nextWeek + 3600000).toISOString(),
    available: 2,
    capacity: 2,
  }
  const full = {
    ...swim,
    id: 'full-lesson',
    category: 'synchronized_swimming',
    title: 'Синхронное плавание',
    available: 0,
    publicOffer: { ...publicOffer, category: 'synchronized_swimming' },
  }
  return [swim, future, full].filter((l) => !category || l.category === category)
}
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
  const parsed = new URL(url, crm),
    q = parsed.searchParams,
    generatedAt = new Date().toISOString()
  if (parsed.pathname === '/api/parent/booking/v2/catalog') {
    let branches = [publicBranch, secondBranch].filter(
      (b) =>
        (!q.get('branchId') || b.id === q.get('branchId')) &&
        (!q.get('city') || b.city === q.get('city')) &&
        (!q.get('q') ||
          [b.name, b.metro, b.address].join(' ').toLowerCase().includes(q.get('q').toLowerCase())),
    )
    if (q.get('cursor')) branches = branches.slice(1)
    return out({
      schemaVersion: 2,
      generatedAt,
      cities: ['Москва'],
      branches: branches.slice(0, 1),
      nextCursor: branches.length > 1 ? 'second' : null,
    })
  }
  if (parsed.pathname === '/api/parent/booking/v2/availability') {
    if (calendarFailures > 0) {
      calendarFailures--
      return out({ error: 'Календарь временно недоступен' }, 503)
    }
    const from = q.get('from'),
      to = q.get('to')
    return out({
      schemaVersion: 2,
      generatedAt,
      requestedRange: { from, to },
      branches: q.getAll('branchId').map((branchId) => {
        const range = publicRange(from, to),
          ls = publicLessons(branchId, q.get('category')),
          days = []
        if (range.coveredRange)
          for (
            let d = range.coveredRange.from;
            d <= range.coveredRange.to;
            d = new Date(+new Date(d) + 86400000).toISOString().slice(0, 10)
          ) {
            const rows = ls.filter((l) => l.localDate === d),
              free = rows.filter((l) => l.available > 0)
            days.push({
              date: d,
              state: free.length ? 'open' : rows.length ? 'full' : 'empty',
              availableLessonCount: free.length,
              nearestAvailableStartsAt: free[0]?.startsAt || null,
            })
          }
        return {
          branchId,
          timeZone: 'Europe/Moscow',
          bookingEnabled: true,
          ...range,
          days,
          nextAvailableStartsAt: ls.find((l) => l.available > 0)?.startsAt || null,
        }
      }),
    })
  }
  if (/^\/api\/parent\/booking\/v2\/branches\/[^/]+\/lessons$/.test(parsed.pathname)) {
    const branchId = parsed.pathname.split('/')[6],
      from = q.get('from'),
      to = q.get('to')
    return out({
      schemaVersion: 2,
      generatedAt,
      branchId,
      ...publicRange(from, to),
      bookingEnabled: true,
      nextCursor: null,
      lessons: publicLessons(branchId, q.get('category')).filter(
        (l) => l.localDate >= from && l.localDate <= to && (!q.get('lessonId') || l.id === q.get('lessonId')),
      ),
    })
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
  if (url === '/api/parent/booking/resend-code') {
    resendCount++
    mailAttempts++
    mailStatus = 'sent'
    return out(hold())
  }
  if (url === '/api/parent/booking/diagnostics') {
    diagnosticEvents.push(input)
    return out({ success: true })
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
  for (const width of [320, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      timezoneId: 'America/Los_Angeles',
    })
    const page = await context.newPage(),
      errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(app + '/select-city')
    await page.getByRole('button', { name: 'Понятно', exact: true }).click()
    const card = page.getByRole('article', { name: 'Бассейн Тестовый филиал', exact: true })
    await card.getByRole('link', { name: 'Выбрать занятие' }).waitFor()
    await card.getByRole('button', { name: 'Весь месяц', exact: true }).click()
    await card.getByRole('button', { name: 'Свернуть до недели' }).waitFor()
    // Week navigation and selection of next week's actual lesson.
    await card.getByRole('button', { name: 'Свернуть до недели' }).click()
    await card.getByRole('button', { name: 'Следующая неделя', exact: true }).click()
    await card.getByRole('link', { name: 'Выбрать занятие' }).waitFor()
    const chosen = card.getByRole('button', { name: /есть свободные места/, pressed: true })
    await chosen.waitFor()
    await card.getByRole('link', { name: 'Выбрать занятие' }).click()
    await page.getByLabel('Ваше имя', { exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('lesson'), 'future-lesson')
    assert.equal(new URL(page.url()).searchParams.get('date'), nextWeek.toISOString().slice(0, 10))
    await page.getByRole('link', { name: 'Все бассейны на эту дату' }).click()
    await page.getByRole('heading', { name: 'Выберите свой бассейн' }).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('date'), nextWeek.toISOString().slice(0, 10))
    await page.getByRole('button', { name: 'Показать ещё бассейны' }).click()
    await page.getByRole('heading', { name: secondBranch.name, exact: true }).waitFor()
    await page.getByRole('searchbox', { name: 'Поиск бассейна' }).fill('Никулина')
    await page.getByRole('heading', { name: secondBranch.name, exact: true }).waitFor()
    await page
      .getByRole('article', { name: 'Бассейн Тестовый филиал', exact: true })
      .waitFor({ state: 'detached' })
    await page.getByRole('searchbox', { name: 'Поиск бассейна' }).fill('не существует')
    await page.getByText('Бассейны не найдены', { exact: true }).waitFor()
    await page.getByRole('searchbox', { name: 'Поиск бассейна' }).fill('')
    await card.waitFor()
    await card.getByRole('button', { name: 'Синхронное плавание', exact: true }).click()
    await card.getByText('На выбранную дату нет доступных занятий.', { exact: false }).waitFor()
    // Go far beyond the open window: not an empty calendar presented as final schedule.
    await card.getByRole('button', { name: 'Весь месяц', exact: true }).click()
    await card.getByRole('button', { name: 'Следующий месяц', exact: true }).click()
    await card.getByRole('button', { name: 'Следующий месяц', exact: true }).click()
    await card.getByText('На эту дату запись пока не открыта.', { exact: false }).waitFor()
    assert.equal(await card.getByRole('button', { name: /есть свободные места/ }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.goto(app + '/select-city')
    await card.getByRole('link', { name: 'Выбрать занятие' }).waitFor()
    await page.getByRole('button', { name: 'Показать ещё бассейны' }).click()
    await page.getByRole('heading', { name: secondBranch.name, exact: true }).waitFor()
    await page.screenshot({ path: '/tmp/lotos-catalog-' + width + '.png', fullPage: true })
    calendarFailures = 1
    await card.getByRole('button', { name: 'Синхронное плавание', exact: true }).click()
    await card.getByRole('button', { name: 'Повторить загрузку календаря' }).click()
    await card.getByRole('button', { name: /мест нет/ }).waitFor()
    // A slow previous direction response cannot replace the current choice.
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    let capturedResolve
    const captured = new Promise((resolve) => {
      capturedResolve = resolve
    })
    const pattern = '**/api/parent/booking/v2/availability?**'
    await page.route(pattern, async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('category') === 'swimming') {
        const response = await route.fetch()
        capturedResolve()
        await gate
        await route.fulfill({ response })
      } else await route.continue()
    })
    await card.getByRole('button', { name: 'Плавание', exact: true }).click()
    await captured
    await card.getByRole('button', { name: 'Синхронное плавание', exact: true }).click()
    await card.getByRole('button', { name: /мест нет/ }).waitFor()
    release()
    await page.unrouteAll({ behavior: 'wait' })
    assert.equal(await card.getByRole('button', { name: /есть свободные места/ }).count(), 0)
    await card.getByRole('button', { name: 'Синхронное плавание', exact: true }).focus()
    assert.equal(
      await card
        .getByRole('button', { name: 'Синхронное плавание', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    )
    assert.deepEqual(errors, [])
    await context.close()
    console.log('Catalog/calendar browser passed: ' + width + 'px')
  }
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
    mailStatus = width === 320 ? 'unknown' : 'sent'
    mailAttempts = 1
    const source = width === 320 ? '&source=yandex_maps' : ''
    await page.goto(app + '/book/test-branch?service=group' + source)
    await page.getByRole('button', { name: 'Понятно', exact: true }).click()
    await page
      .getByRole('button', { name: 'Записаться · оплата на месте', exact: true })
      .filter({ visible: true })
      .first()
      .click()
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
      assert.equal(JSON.parse(lastPayload).source, width === 320 ? 'yandex_maps' : undefined)
      if (width === 320) {
        await page.getByRole('button', { name: 'Отправить код ещё раз' }).click()
        await page.getByText('Код отправлен на указанный email.', { exact: false }).waitFor()
        assert.equal(resendCount, 1)
      }
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
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.ok(diagnosticEvents.length >= 2)
  for (const event of diagnosticEvents) {
    assert.equal(event.screen, 'Онлайн-запись')
    assert.equal(event.branchId, 'test-branch')
    assert.doesNotMatch(JSON.stringify(event), /test@example|79990000000|Тестовый ребёнок|password/i)
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
