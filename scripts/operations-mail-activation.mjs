// Yandex documents a 2–3 hour activation window for a new application password.
// This stores only acceptance progress, never credentials.
export async function activateMail(previous, values, checks, sender, now = Date.now()) {
  const timestamp = Date.parse(values.OPS_SMTP_NOT_BEFORE || '')
  if (!Number.isFinite(timestamp) || values.OPS_EMAIL_TO !== 'lotos.crm@yandex.ru')
    return { status: 'blocked', accepted: 0, attempts: 0 }
  const configurationAt = new Date(timestamp).toISOString()
  const prior =
    previous?.configurationAt === configurationAt &&
    Number.isSafeInteger(previous.accepted) &&
    previous.accepted >= 0 &&
    previous.accepted <= 2 &&
    Number.isSafeInteger(previous.attempts) &&
    previous.attempts >= 0 &&
    previous.attempts <= 3
      ? previous
      : { configurationAt, accepted: 0, attempts: 0, lastAttemptAt: null }
  const state = { ...prior }
  if (state.accepted === 2) return { ...state, status: 'accepted' }
  if (now < timestamp) return { ...state, status: 'waiting' }
  if (state.attempts >= 3) {
    // A replaced application password must not leave monitoring disabled forever.
    // One bounded retry window per day; keep accepted messages to avoid duplicates.
    if (!state.lastAttemptAt || now - Date.parse(state.lastAttemptAt) < 24 * 60 * 60000)
      return { ...state, status: 'attention-required' }
    state.attempts = 0
  }
  if (state.lastAttemptAt && now - Date.parse(state.lastAttemptAt) < 30 * 60000)
    return { ...state, status: 'retry-later' }
  state.attempts++
  state.lastAttemptAt = new Date(now).toISOString()
  try {
    for (; state.accepted < 2; state.accepted++) {
      const pending = {
        kind: state.accepted === 0 ? 'unavailable' : 'recovered',
        at: configurationAt,
        exercise: true,
      }
      await sender({ at: new Date(now).toISOString(), checks, pending })
    }
    state.status = 'accepted'
  } catch {
    state.status = state.attempts >= 3 ? 'attention-required' : 'retry-later'
  }
  return state
}
