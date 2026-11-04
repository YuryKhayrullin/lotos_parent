import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
export const targets = [
  ['crm-live', 'https://lotos-crm-staging.vercel.app/api/health/live', 'ok'],
  ['crm-ready', 'https://lotos-crm-staging.vercel.app/api/health/ready', 'ready'],
  ['crm-document', 'https://lotos-crm-staging.vercel.app/', null],
  ['parent-catalog', 'https://lotos-parent-inky.vercel.app/api/parent/booking/catalog', null],
  ['backup-freshness', 'https://lotos-crm-staging.vercel.app/api/health/backups', 'ok'],
]
export function transition(previous, checks, now = new Date().toISOString()) {
  const valid = previous?.version === 1 && Number.isSafeInteger(previous.failures) && previous.failures >= 0
  const prior = valid ? previous : { version: 1, failures: 0, incident: false }
  const healthy = checks.length === targets.length && checks.every((c) => c.status === 200 && c.ok)
  const failures = healthy ? 0 : Math.min(prior.failures + 1, 1000)
  const incident = healthy ? false : prior.incident || failures >= 2
  let pending = prior.pending || null
  if (healthy && prior.incident) pending = { kind: 'recovered', at: now }
  else if (!healthy && incident && !prior.incident) pending = { kind: 'unavailable', at: now }
  else if (healthy && pending?.kind === 'unavailable') pending = null
  // A notification remains pending when SMTP rejects/fails; the next run retries it.
  return {
    version: 1,
    at: now,
    failures,
    incident,
    pending,
    checks: checks.map((c) => ({ name: c.name, status: c.status, ok: c.ok, ms: c.ms })),
  }
}
export async function probe(fetcher = fetch) {
  return Promise.all(
    targets.map(async ([name, url, expected]) => {
      const started = performance.now()
      try {
        const response = await fetcher(url, {
          redirect: 'error',
          cache: 'no-store',
          signal: AbortSignal.timeout(12000),
        })
        let ok = response.status === 200
        if (expected) {
          const body = await response.json()
          ok = ok && body.status === expected
        } else await response.body?.cancel()
        return { name, status: response.status, ok, ms: Math.round(performance.now() - started) }
      } catch {
        return { name, status: 0, ok: false, ms: Math.round(performance.now() - started) }
      }
    }),
  )
}
export async function sendNotification(state, values = process.env) {
  const fields = [
    'OPS_SMTP_HOST',
    'OPS_SMTP_PORT',
    'OPS_SMTP_USER',
    'OPS_SMTP_PASSWORD',
    'OPS_SMTP_FROM',
    'OPS_EMAIL_TO',
  ]
  if (
    fields.some((k) => !values[k]) ||
    !['465', '587'].includes(values.OPS_SMTP_PORT) ||
    !values.OPS_EMAIL_TO?.match(/^[^\s@,;]+@[^\s@,;]+$/)
  )
    throw Error('OPERATIONS_MAIL_NOT_CONFIGURED')
  const { default: nodemailer } = await import('nodemailer')
  const transport = nodemailer.createTransport({
    host: values.OPS_SMTP_HOST,
    port: Number(values.OPS_SMTP_PORT),
    secure: values.OPS_SMTP_PORT === '465',
    requireTLS: true,
    auth: { user: values.OPS_SMTP_USER, pass: values.OPS_SMTP_PASSWORD },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    tls: { rejectUnauthorized: true },
    logger: false,
    debug: false,
  })
  const recovered = state.pending.kind === 'recovered'
  try {
    await transport.sendMail({
      messageId:
        '<' +
        createHash('sha256')
          .update(state.pending.kind + ':' + state.pending.at)
          .digest('hex') +
        '@lotos.operations>',
      from: values.OPS_SMTP_FROM,
      to: values.OPS_EMAIL_TO,
      subject: recovered ? 'LOTOS — доступ восстановлен' : 'LOTOS — обнаружен сбой',
      text: [
        recovered
          ? 'Проверки LOTOS снова проходят.'
          : 'Два последовательных прогона обнаружили недоступность LOTOS или устаревшую резервную копию.',
        'Время UTC: ' + state.at,
        ...state.checks.map((c) => c.name + ': HTTP ' + c.status + ', ' + c.ms + ' мс'),
        'Это проверка из сети GitHub Actions, а не подтверждение доступности у всех тренеров.',
      ].join('\n'),
    })
  } finally {
    transport.close()
  }
}
export async function run({
  stateFile = '.artifacts/monitor/monitor-state.json',
  deliver = false,
  fetcher = fetch,
  sender = sendNotification,
} = {}) {
  let previous = null
  try {
    previous = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
  } catch {}
  const checks = await probe(fetcher),
    state = transition(previous, checks)
  let mailFailed = false
  if (deliver && state.pending) {
    try {
      await sender(state)
      state.pending = null
      state.lastNotification = state.at
    } catch {
      mailFailed = true
    }
  }
  fs.mkdirSync(path.dirname(stateFile), { recursive: true })
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2))
  console.log(
    JSON.stringify({
      at: state.at,
      incident: state.incident,
      failures: state.failures,
      checks: state.checks,
      mailFailed,
      pending: !!state.pending,
    }),
  )
  return { state, mailFailed }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const deliver = process.argv.includes('--send')
  if (
    deliver &&
    (process.env.GITHUB_REPOSITORY !== 'YuryKhayrullin/lotos_parent' ||
      !['schedule', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME))
  )
    throw Error('Trusted operations workflow required')
  const { state, mailFailed } = await run({ deliver })
  if (state.incident || mailFailed) process.exitCode = 1
}
