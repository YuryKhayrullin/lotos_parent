import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mondayOf, parseCalendarDay } from '../lib/contracts'

test('invalid dates from schedule URLs fall back before calendar arithmetic', () => {
  const today = '2026-11-21'
  for (const query of ['month=2026-13', 'day=2026-02-30', '']) {
    const params = new URLSearchParams(query)
    const base = parseCalendarDay(params.get('month') + '-01') || parseCalendarDay(params.get('day')) || today
    assert.equal(base.slice(0, 7), '2026-11')
    assert.equal(mondayOf(base), '2026-11-16')
  }
  assert.equal(parseCalendarDay('2028-02-29'), '2028-02-29')
  assert.equal(mondayOf(parseCalendarDay('2027-01-01')), '2026-12-28')
})
