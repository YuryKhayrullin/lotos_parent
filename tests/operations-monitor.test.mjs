import { test } from 'node:test'
import assert from 'node:assert/strict'
import { targets, transition, probe } from '../scripts/operations-monitor.mjs'
const good = () => targets.map(([name]) => ({ name, status: 200, ok: true, ms: 10 }))
const catalog = { schemaVersion: 2, branches: [{ id: 'pool-1', name: 'Тестовый бассейн' }] }
const json = (body) => Response.json(body)
const html = (body) => new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } })
const trialPage = '<main data-trial-entry=""><button aria-haspopup="dialog">Бассейн</button></main>'
test('two failures open an incident and recovery closes it', () => {
  const checks = good()
  checks[0] = { ...checks[0], status: 0, ok: false }
  const first = transition(null, checks)
  assert.equal(first.incident, false)
  assert.equal(first.failures, 1)
  const second = transition(first, checks)
  assert.equal(second.incident, true)
  assert.equal(second.failures, 2)
  assert.equal(transition(second, checks).incident, true)
  const recovered = transition(second, good())
  assert.equal(recovered.incident, false)
  assert.equal(recovered.failures, 0)
})
test('probe checks actual readiness and never follows redirects', async () => {
  const calls = []
  const result = await probe(async (url, options) => {
    calls.push(options)
    return json({ status: url.includes('/ready') ? 'wrong' : 'ok' })
  })
  assert.equal(result.find((r) => r.name === 'crm-ready').ok, false)
  assert.equal(result.find((r) => r.name === 'crm-live').ok, true)
  assert.equal(
    calls.every((c) => c.redirect === 'error'),
    true,
  )
})

test('duplicate check names cannot hide a missing service', () => {
  const checks = good()
  checks[1] = { ...checks[0] }
  assert.equal(transition(transition(null, checks), checks).incident, true)
})
test('malformed catalog, redirects and HTML are not a healthy API', async () => {
  const result = await probe(
    async (url) =>
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )
  assert.equal(result.find((r) => r.name === 'parent-catalog').ok, false)
  assert.equal(result.find((r) => r.name === 'crm-document').ok, false)
})
test('the monitor rejects an empty v2 catalog and a trial page without pool cards', async () => {
  const requests = []
  const checks = await probe(async (url) => {
    requests.push(new URL(url).pathname)
    if (url.endsWith('/catalog')) return json({ ...catalog, branches: [] })
    if (url.includes('source=yandex_maps')) return html('<main data-trial-entry="">Загрузка</main>')
    return json({ status: url.endsWith('/ready') ? 'ready' : 'ok' })
  })
  assert.ok(requests.includes('/api/parent/booking/v2/catalog'))
  assert.ok(!requests.includes('/api/parent/booking/catalog'))
  assert.deepEqual(
    checks
      .filter((check) => ['parent-catalog', 'parent-trial'].includes(check.name))
      .map(({ status, ok }) => [status, ok]),
    [
      [200, false],
      [200, false],
    ],
  )
})

test('persisted legacy SMTP failures do not affect healthy service checks', async () => {
  const { run } = await import('../scripts/operations-monitor.mjs')
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lotos-monitor-test-'))
  const stateFile = path.join(directory, 'state.json')
  const fetcher = async (url) => {
    if (url.endsWith('.app/')) return html('<html></html>')
    if (url.includes('source=yandex_maps')) return html(trialPage)
    if (url.endsWith('/catalog')) return json(catalog)
    return json({ status: url.endsWith('/ready') ? 'ready' : 'ok' })
  }
  try {
    fs.writeFileSync(
      stateFile,
      JSON.stringify({
        version: 1,
        failures: 0,
        incident: false,
        pending: { kind: 'recovered', at: '2026-11-01T00:00:00Z' },
        mailActivation: { status: 'attention-required', attempts: 3 },
        lastNotification: '2026-11-01T00:00:00Z',
      }),
    )
    const result = await run({ stateFile, fetcher })
    const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
    assert.deepEqual(saved, result.state)
    assert.equal(saved.incident, false)
    assert.equal(saved.failures, 0)
    assert.equal(saved.checks.length, targets.length)
    for (const field of ['pending', 'mailActivation', 'lastNotification']) assert.equal(field in saved, false)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
