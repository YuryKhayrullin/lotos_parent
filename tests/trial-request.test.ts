import assert from 'node:assert/strict'
import test from 'node:test'
import { trialPhone } from '../lib/trial-request'

test('trial phone accepts a national number and pasted +7 or trunk 8 without duplicating the prefix', () => {
  for (const input of ['+7 (999) 123-45-67', '8 999 123 45 67', '9991234567']) {
    const phone = trialPhone(input)
    assert.equal(phone.formatted, '(999) 123-45-67')
    assert.equal(phone.national, '9991234567')
  }
})

test('trial phone can be erased progressively without trapping the caret on a closing bracket', () => {
  assert.equal(trialPhone('(999) ').formatted, '(999')
  assert.equal(trialPhone('(999').formatted, '(999')
  assert.equal(trialPhone('+7').formatted, '')
})
