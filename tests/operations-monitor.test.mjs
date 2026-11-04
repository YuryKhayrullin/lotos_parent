import { test } from 'node:test'
import assert from 'node:assert/strict'
import { targets, transition, probe } from '../scripts/operations-monitor.mjs'
const good = () => targets.map(([name]) => ({ name, status: 200, ok: true, ms: 10 }))
test('one transient failure sends nothing; two failures open one incident; recovery closes it', () => {
  const checks = good()
  checks[0] = { ...checks[0], status: 0, ok: false }
  const first = transition(null, checks)
  assert.equal(first.pending, null)
  const second = transition(first, checks)
  assert.equal(second.pending.kind, 'unavailable')
  const delivered = { ...second, pending: null }
  assert.equal(transition(delivered, checks).pending, null)
  const recovered = transition(delivered, good())
  assert.equal(recovered.pending.kind, 'recovered')
  assert.equal(transition({ ...recovered, pending: null }, good()).pending, null)
})
test('a failed SMTP delivery keeps the notification pending', () => {
  const checks = good()
  checks[1].ok = false
  const state = transition(transition(null, checks), checks)
  assert.equal(transition(state, checks).pending.kind, 'unavailable')
})
test('probe checks actual readiness and never follows redirects', async () => {
  const calls = []
  const result = await probe(async (url, options) => {
    calls.push(options)
    return new Response(JSON.stringify({ status: url.includes('/ready') ? 'wrong' : 'ok' }), { status: 200 })
  })
  assert.equal(result.find((r) => r.name === 'crm-ready').ok, false)
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

test('mail activation progress survives actual persisted runs and accepted exercises are not resent', async () => {
  const { run } = await import('../scripts/operations-monitor.mjs')
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lotos-monitor-test-'))
  const stateFile = path.join(directory, 'state.json')
  let sent = 0
  const fetcher = async (url) => {
    if (url.endsWith('.app/'))
      return new Response('<html></html>', { headers: { 'content-type': 'text/html' } })
    return new Response(
      JSON.stringify(
        url.endsWith('/catalog') ? { branches: [] } : { status: url.endsWith('/ready') ? 'ready' : 'ok' },
      ),
    )
  }
  const values = {
    OPS_SMTP_NOT_BEFORE: new Date(Date.now() - 1000).toISOString(),
    OPS_EMAIL_TO: 'lotos.crm@yandex.ru',
  }
  try {
    const first = await run({
      stateFile,
      deliver: true,
      fetcher,
      values,
      sender: async () => {
        sent++
      },
    })
    assert.equal(first.state.mailActivation.status, 'accepted')
    assert.equal(sent, 2)
    const next = await run({
      stateFile,
      deliver: true,
      fetcher,
      values,
      sender: async () => {
        sent++
      },
    })
    assert.equal(next.state.mailActivation.status, 'accepted')
    assert.equal(sent, 2)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
