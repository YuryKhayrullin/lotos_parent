import test from 'node:test'
import assert from 'node:assert/strict'
import { cookieNoticeDismissed, cookieNoticeLifetime } from '../lib/legal/cookie-notice'
import { isLegalSlug, legalDocuments, legalStatus, legalVersion } from '../lib/legal/documents'

test('cookie notice expires and rejects malformed, future or unbounded browser values', () => {
  const now = 1800000000000
  assert.equal(cookieNoticeDismissed(JSON.stringify({ dismissedAt: now - 1 }), now), true)
  assert.equal(cookieNoticeDismissed(JSON.stringify({ dismissedAt: now - cookieNoticeLifetime }), now), false)
  for (const value of [
    null,
    '',
    '{',
    'null',
    '[]',
    'true',
    '{}',
    '{"dismissedAt":"1800000000000"}',
    JSON.stringify({ dismissedAt: now + 1 }),
    '{"dismissedAt":1e999}',
  ]) {
    assert.equal(cookieNoticeDismissed(value, now), false)
  }
})
test('legal routes allow only authored documents and keep unapproved texts visibly in draft', () => {
  for (const slug of ['privacy', 'cookies', 'consent', 'terms']) assert.equal(isLegalSlug(slug), true)
  for (const slug of ['__proto__', 'constructor', '../privacy', 'offer', ''])
    assert.equal(isLegalSlug(slug), false)
  assert.equal(legalStatus, 'draft')
  assert.match(legalVersion, /draft/)
  assert.match(
    legalDocuments.consent.sections.flatMap((x) => x.paragraphs).join(' '),
    /приём этого согласия не включён/,
  )
})
