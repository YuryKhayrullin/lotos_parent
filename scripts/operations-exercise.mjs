import { targets, transition, sendNotification } from './operations-monitor.mjs'

// This exercise never touches production or the persisted incident state.
if (
  process.env.GITHUB_REPOSITORY !== 'YuryKhayrullin/lotos_parent' ||
  process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
  process.env.GITHUB_REF !== 'refs/heads/main' ||
  process.env.OPS_EMAIL_TO !== 'lotos.crm@yandex.ru'
)
  throw Error('TRUSTED_EXERCISE_REQUIRED')
const good = targets.map(([name]) => ({ name, status: 200, ok: true, ms: 20 }))
const bad = good.map((c, i) => (i === 0 ? { ...c, status: 0, ok: false } : c))
let state = transition(transition(null, bad), bad)
try {
  state.pending.exercise = true
  await sendNotification(state)
  console.log('EXERCISE_UNAVAILABLE_ACCEPTED')
  state = transition({ ...state, pending: null }, good)
  state.pending.exercise = true
  await sendNotification(state)
  console.log('EXERCISE_RECOVERED_ACCEPTED')
} catch {
  console.error('EXERCISE_MAIL_FAILED; no credentials logged')
  process.exitCode = 1
}
