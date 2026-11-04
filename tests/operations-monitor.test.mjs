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
