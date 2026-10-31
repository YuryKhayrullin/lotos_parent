import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedParentGetPath, releaseIdentifier } from '../lib/server/parent-route-policy'

test('public booking v2 read routes pass through the parent gateway', () => {
  assert.equal(isAllowedParentGetPath(['booking', 'v2', 'catalog']), true)
  assert.equal(isAllowedParentGetPath(['booking', 'v2', 'availability']), true)
  assert.equal(
    isAllowedParentGetPath(['booking', 'v2', 'branches', '983ace0e-a75d-4061-94c7-c54bb330aba3', 'lessons']),
    true,
  )
})

test('parent gateway rejects malformed and unknown read routes', () => {
  assert.equal(isAllowedParentGetPath(['booking', 'v2']), false)
  assert.equal(isAllowedParentGetPath(['booking', 'v2', 'catalog', 'extra']), false)
  assert.equal(isAllowedParentGetPath(['booking', 'v2', 'branches', '../private', 'lessons']), false)
  assert.equal(isAllowedParentGetPath(['booking', 'v2', 'branches', 'branch/id', 'lessons']), false)
  assert.equal(isAllowedParentGetPath(['booking', 'v2', 'diagnostics']), false)
})

test('release identifier is bounded and never exposes arbitrary environment content', () => {
  assert.equal(releaseIdentifier({ VERCEL_GIT_COMMIT_SHA: 'A'.repeat(40) }), 'aaaaaaaaaaaa')
  assert.equal(releaseIdentifier({ NEXT_PUBLIC_BUILD_SHA: '1234567' }), '1234567')
  assert.equal(releaseIdentifier({ VERCEL_GIT_COMMIT_SHA: 'secret value' }), 'local')
})
