import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { contentSecurityPolicy } from '../lib/server/content-security-policy'

test('production policy requires a server nonce and denies script attributes and framing', () => {
  const nonce = randomBytes(32).toString('base64')
  const policy = contentSecurityPolicy(nonce, false, true)
  const scripts = policy.split(';').find((value) => value.trim().startsWith('script-src '))!
  assert.ok(scripts.includes("'nonce-" + nonce + "'"))
  assert.match(scripts, /strict-dynamic/)
  assert.doesNotMatch(scripts, /unsafe-/)
  for (const directive of [
    "default-src 'self'",
    "script-src-attr 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ])
    assert.ok(policy.includes(directive), directive)
  assert.throws(() => contentSecurityPolicy("attacker'; script-src *", false, true))
})
test('development allows Next debugging and local websockets without forcing HTTPS', () => {
  const policy = contentSecurityPolicy(randomBytes(32).toString('base64'), true, false)
  assert.match(policy, /unsafe-eval/)
  assert.match(policy, /connect-src 'self' ws: wss:/)
  assert.doesNotMatch(policy, /upgrade-insecure-requests/)
})
