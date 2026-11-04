import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarize } from '../scripts/performance-check.mjs'
test('read acceptance rejects errors, insufficient samples and a slow tail', () => {
  const good = Array.from({ length: 100 }, () => ({ ok: true, ms: 200 }))
  assert.equal(summarize(good, 1000, 2000).passed, true)
  assert.equal(summarize(good.slice(1), 1000, 2000).passed, false)
  assert.equal(summarize([...good.slice(1), { ok: false, ms: 1 }], 1000, 2000).passed, false)
  assert.equal(
    summarize([...good.slice(2), ...Array.from({ length: 2 }, () => ({ ok: true, ms: 5001 }))], 1000, 5000)
      .passed,
    false,
  )
})
