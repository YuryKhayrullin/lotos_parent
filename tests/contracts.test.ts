import test from 'node:test'
import assert from 'node:assert/strict'
import { localDay, addDays, mondayOf, money, ageYears } from '../lib/contracts'
import { configuration, databaseOptions } from '../lib/server/config'
import { daySchema } from '../lib/server/crm-read'

test('day and week follow branch timezone at Moscow midnight', () => {
  assert.equal(localDay('Europe/Moscow', new Date('2026-10-13T22:30:00Z')), '2026-10-14')
  assert.equal(mondayOf('2026-10-14'), '2026-10-12')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})
test('payments retain kopecks and do not lose bigint precision', () => {
  assert.equal(money('800000'), '8\u00a0000 ₽')
  assert.equal(money('12345'), '123,45 ₽')
  assert.match(money('900719925474099312'), /12 ₽$/)
})
test('age handles birthday boundary', () => {
  assert.equal(ageYears('2018-10-15', '2026-10-14'), 7)
  assert.equal(ageYears('2018-10-15', '2026-10-15'), 8)
  assert.equal(ageYears(null, '2026-10-15'), null)
})
test('date rejects impossible days', () => {
  assert.equal(daySchema.safeParse('2026-02-30').success, false)
  assert.equal(daySchema.safeParse('2026-02-28').success, true)
})
const local = {
  APP_ENV: 'test',
  APP_URL: 'http://127.0.0.1:3100',
  BETTER_AUTH_SECRET: 'test-only-secret-with-more-than-thirty-two-characters',
  DATABASE_URL: 'postgresql://parent:local@127.0.0.1:5432/parent_test',
  CRM_READ_DATABASE_URL: 'postgresql://lotos_parent_reader:local@127.0.0.1:5432/crm_test',
}
test('configuration fails closed for missing profile, shared DB and privileged CRM role', () => {
  assert.throws(() => configuration({}))
  assert.throws(() => configuration({ ...local, DATABASE_URL: local.CRM_READ_DATABASE_URL }))
  assert.throws(() =>
    configuration({
      ...local,
      CRM_READ_DATABASE_URL: local.CRM_READ_DATABASE_URL.replace('lotos_parent_reader', 'postgres'),
    }),
  )
  assert.throws(() => configuration({ ...local, VERCEL: '1' }))
})
test('production requires HTTPS and cannot enable preview', () => {
  const cloud = {
    ...local,
    APP_ENV: 'production',
    APP_URL: 'https://parent.example',
    DATABASE_URL: 'postgresql://parent:unused@parent.example/parent',
    CRM_READ_DATABASE_URL: 'postgresql://lotos_parent_reader:unused@crm.example/postgres',
  }
  assert.throws(() => configuration({ ...cloud, APP_URL: 'http://parent.example' }))
  assert.throws(() => configuration({ ...cloud, PARENT_PREVIEW: '1' }))
  const config = configuration(cloud)
  const options = databaseOptions(cloud.CRM_READ_DATABASE_URL + '?sslmode=no-verify', undefined, config)
  assert.deepEqual(options.ssl, { rejectUnauthorized: true })
  assert.equal(new URL(options.connectionString).searchParams.has('sslmode'), false)
})
