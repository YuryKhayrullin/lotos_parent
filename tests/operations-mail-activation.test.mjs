import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activateMail } from '../scripts/operations-mail-activation.mjs'
const timestamp = Date.parse('2026-11-04T15:33:00Z')
const values = { OPS_SMTP_NOT_BEFORE: new Date(timestamp).toISOString(), OPS_EMAIL_TO: 'lotos.crm@yandex.ru' }
test('new Yandex credentials are not used before activation; acceptance sends two labelled exercises once', async () => {
  const sent = []
  const sender = async (state) => {
    sent.push(state.pending)
  }
  let state = await activateMail(null, values, [], sender, timestamp - 1)
  assert.equal(state.status, 'waiting')
  assert.equal(sent.length, 0)
  state = await activateMail(state, values, [], sender, timestamp)
  assert.equal(state.status, 'accepted')
  assert.deepEqual(
    sent.map((s) => s.kind),
    ['unavailable', 'recovered'],
  )
  assert.equal(
    sent.every((s) => s.exercise),
    true,
  )
  await activateMail(state, values, [], sender, timestamp + 60000)
  assert.equal(sent.length, 2)
})
test('partial acceptance does not resend the accepted first email and retries are bounded', async () => {
  let calls = 0
  let state = await activateMail(
    null,
    values,
    [],
    async () => {
      if (++calls === 2) throw Error('simulated')
    },
    timestamp,
  )
  assert.equal(state.accepted, 1)
  state = await activateMail(
    state,
    values,
    [],
    async () => {
      throw Error('must not run')
    },
    timestamp + 1000,
  )
  assert.equal(state.attempts, 1)
  state = await activateMail(
    state,
    values,
    [],
    async (s) => {
      assert.equal(s.pending.kind, 'recovered')
    },
    timestamp + 30 * 60000,
  )
  assert.equal(state.status, 'accepted')
  state = null
  for (let i = 0; i < 4; i++)
    state = await activateMail(
      state,
      values,
      [],
      async () => {
        throw Error('auth')
      },
      timestamp + i * 30 * 60000,
    )
  assert.equal(state.attempts, 3)
  assert.equal(state.status, 'attention-required')
})
test('invalid timing or another recipient cannot enable activation', async () => {
  const sender = async () => {
    throw Error('must not run')
  }
  assert.equal(
    (await activateMail(null, { ...values, OPS_SMTP_NOT_BEFORE: 'invalid' }, [], sender)).status,
    'blocked',
  )
  assert.equal(
    (await activateMail(null, { ...values, OPS_EMAIL_TO: 'other@example.test' }, [], sender)).status,
    'blocked',
  )
})
