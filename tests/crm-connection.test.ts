import test from 'node:test'
import assert from 'node:assert/strict'
import { crmJson, crmReady } from '../lib/server/crm-api'
import { ApiError, isConnectionFailure } from '../lib/server/errors'
import { ConfigurationError } from '../lib/server/config'

test('an old CRM HTML response becomes a controlled service error', async (t) => {
  const settings = {
    APP_ENV: 'test',
    APP_URL: 'http://localhost:3100',
    CRM_API_URL: 'http://localhost:3002',
    CRM_GATEWAY_SECRET: 'a'.repeat(64),
  }
  const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]))
  Object.assign(process.env, settings)
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('<html>Not found</html>', { status: 404 }),
  )
  await assert.rejects(
    crmJson('auth/get-session', new Headers()),
    (error: unknown) => error instanceof ApiError && error.status === 503 && isConnectionFailure(error),
  )
  fetch.mock.mockImplementation(async () => new Response('null'))
  await assert.rejects(crmJson('auth/get-session', new Headers()), ApiError)
  fetch.mock.mockImplementation(async () =>
    Response.json({ error: 'Нужен вход', code: 'UNAUTHORIZED' }, { status: 401 }),
  )
  await assert.rejects(
    crmJson('auth/get-session', new Headers()),
    (error: unknown) => error instanceof ApiError && error.status === 401 && !isConnectionFailure(error),
  )
  assert.equal(await crmReady(), true)
  fetch.mock.mockImplementation(
    async () => new Response('<html>Authentication required</html>', { status: 401 }),
  )
  await assert.rejects(crmReady(), (error: unknown) => error instanceof ApiError && error.status === 503)
  fetch.mock.mockImplementation(async () => Response.json({ error: 'Unavailable' }, { status: 401 }))
  assert.equal(await crmReady(), false)
  fetch.mock.mockImplementation(async () => Response.json({ user: { id: 'unexpected' } }))
  assert.equal(await crmReady(), false)
  fetch.mock.mockImplementation(async () => Response.json({ code: 'UNAVAILABLE' }, { status: 503 }))
  assert.equal(await crmReady(), false)
})

test('connection handling preserves unexpected programming errors', () => {
  assert.equal(isConnectionFailure(new ConfigurationError('missing setting')), true)
  assert.equal(isConnectionFailure(new TypeError('unexpected programming error')), false)
})
