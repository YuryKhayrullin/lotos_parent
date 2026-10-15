import test from 'node:test'
import assert from 'node:assert/strict'
import { localDay, addDays, mondayOf, money, ageYears } from '../lib/contracts'
import { configuration } from '../lib/server/config'
import { gatewaySignature, parentCookies } from '../lib/server/crm-api'

test('dates follow branch timezone and calendar boundaries', () => {
  assert.equal(localDay('Europe/Moscow', new Date('2026-10-13T22:30:00Z')), '2026-10-14')
  assert.equal(mondayOf('2026-10-14'), '2026-10-12')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(ageYears('2018-10-15', '2026-10-14'), 7)
  assert.equal(ageYears('2018-10-15', '2026-10-15'), 8)
})
test('payments retain kopecks and bigint precision', () => {
  assert.equal(money('800000'), '8\u00a0000 ₽')
  assert.equal(money('12345'), '123,45 ₽')
  assert.match(money('900719925474099312'), /12 ₽$/)
})
const local = {
  APP_ENV: 'test',
  APP_URL: 'http://127.0.0.1:3100',
  CRM_API_URL: 'http://127.0.0.1:3002',
  CRM_GATEWAY_SECRET: 'a'.repeat(64),
}
test('configuration rejects missing gateway settings, loops and unsafe origins', () => {
  assert.throws(() => configuration({}))
  assert.equal(configuration(local).CRM_API_URL, local.CRM_API_URL)
  assert.throws(() => configuration({ ...local, CRM_API_URL: local.APP_URL }))
  assert.throws(() => configuration({ ...local, CRM_API_URL: 'http://user:pass@example.com' }))
  assert.throws(() => configuration({ ...local, CRM_API_URL: 'http://127.0.0.1:3002/api' }))
  assert.throws(() => configuration({ ...local, VERCEL: '1' }))
  const remote = { ...local, CRM_API_URL: 'https://crm.example.com' }
  assert.throws(() => configuration(remote))
  assert.equal(configuration({ ...remote, LOCAL_CRM_API: '1' }).LOCAL_CRM_API, '1')
})
test('cloud requires HTTPS and forbids local opt-in', () => {
  const cloud = {
    ...local,
    APP_ENV: 'production',
    APP_URL: 'https://parent.example.com',
    CRM_API_URL: 'https://crm.example.com',
  }
  assert.equal(configuration(cloud).APP_ENV, 'production')
  assert.throws(() => configuration({ ...cloud, APP_URL: 'http://parent.example.com' }))
  assert.throws(() => configuration({ ...cloud, CRM_API_URL: 'http://127.0.0.1:3002' }))
  assert.throws(() => configuration({ ...cloud, LOCAL_CRM_API: '1' }))
})
test('gateway signatures bind every request component', () => {
  const args: Parameters<typeof gatewaySignature> = [
    'b'.repeat(64),
    '1790000000000',
    'POST',
    '/api/parent/auth/sign-in/email',
    'lotos_parent.session_token=x',
    '127.0.0.1',
    '{"email":"test@example.test"}',
  ]
  const baseline = gatewaySignature(...args)
  for (let index = 0; index < args.length; index++) {
    const changed = [...args] as typeof args
    changed[index] += 'x'
    assert.notEqual(gatewaySignature(...changed), baseline)
  }
})
test('only parent cookies cross the gateway', () => {
  assert.equal(
    parentCookies('lotos.session_token=staff; lotos_parent.session_token=parent; unrelated=x'),
    'lotos_parent.session_token=parent',
  )
  assert.equal(
    parentCookies('__Secure-lotos_parent.session_token=secure; __Secure-lotos.session_token=staff'),
    '__Secure-lotos_parent.session_token=secure',
  )
})
