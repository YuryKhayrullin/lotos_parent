export type TrialRequestConsent = { version: string; url: string }

export function trialPhone(value: string) {
  const digits = value.replace(/[^0-9]/g, '')
  const prefixLength = /^\s*\+7/.test(value) || (digits.length >= 11 && /^[78]/.test(digits)) ? 1 : 0
  const national = digits.slice(prefixLength, prefixLength + 10)
  const parts = [national.slice(0, 3), national.slice(3, 6), national.slice(6, 8), national.slice(8, 10)]
  const formatted = parts[0]
    ? '(' + parts[0] + (parts[1] ? ') ' + parts.slice(1).filter(Boolean).join('-') : '')
    : ''
  return { national, formatted, prefixLength }
}
