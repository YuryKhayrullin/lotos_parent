import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inspect, reason } from '../scripts/operations-smtp-diagnosis.mjs'
test('diagnosis rejects another host/account and never exposes a configured password', () => {
  const values = {
    OPS_SMTP_HOST: 'smtp.yandex.ru',
    OPS_SMTP_PORT: '465',
    OPS_SMTP_USER: 'lotos.crm',
    OPS_SMTP_FROM: 'lotos.crm@yandex.ru',
    OPS_EMAIL_TO: 'lotos.crm@yandex.ru',
    OPS_SMTP_PASSWORD: 'fictional-private-value',
  }
  assert.equal(inspect(values).configured, true)
  assert.equal(inspect({ ...values, OPS_SMTP_HOST: 'example.test' }).configured, false)
  assert.equal(inspect({ ...values, OPS_EMAIL_TO: 'other@example.test' }).configured, false)
  assert.equal(JSON.stringify(inspect(values)).includes(values.OPS_SMTP_PASSWORD), false)
  assert.equal(inspect({ ...values, OPS_SMTP_PASSWORD: 'one two' }).internalWhitespace, true)
})
test('provider responses are mapped to safe categories without copying response text', () => {
  assert.equal(reason({ response: '535 Invalid user or password! opaque-private-response' }), 'AUTH_REJECTED')
  assert.equal(reason({ response: 'application-specific password required' }), 'APP_PASSWORD_REQUIRED')
})
