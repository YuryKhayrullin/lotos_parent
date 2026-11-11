import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
export const targets = [
  ['crm-live', 'https://lotos-crm-staging.vercel.app/api/health/live', 'ok'],
  ['parent-health', 'https://lotos-parent-inky.vercel.app/api/health', 'ok'],
  ['crm-ready', 'https://lotos-crm-staging.vercel.app/api/health/ready', 'ready'],
  ['crm-document', 'https://lotos-crm-staging.vercel.app/', null],
  ['parent-catalog', 'https://lotos-parent-inky.vercel.app/api/parent/booking/catalog', null],
  ['backup-freshness', 'https://lotos-crm-staging.vercel.app/api/health/backups', 'ok'],
]
export function transition(previous, checks, now = new Date().toISOString()) {
  const valid = previous?.version === 1 && Number.isSafeInteger(previous.failures) && previous.failures >= 0
  const prior = valid ? previous : { version: 1, failures: 0, incident: false }
  const healthy =
    checks.length === targets.length &&
    targets.every(([name]) => checks.filter((c) => c.name === name && c.status === 200 && c.ok).length === 1)
  const failures = healthy ? 0 : Math.min(prior.failures + 1, 1000)
  const incident = healthy ? false : prior.incident || failures >= 2
  return {
    version: 1,
    at: now,
    failures,
    incident,
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
        } else if (name === 'parent-catalog') {
          const body = await response.json()
          ok = ok && Array.isArray(body?.branches)
        } else {
          ok = ok && /^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '')
          await response.body?.cancel()
        }
        // A successful response that consistently exceeds this bound is degraded.
        ok = ok && performance.now() - started <= 5000
        return { name, status: response.status, ok, ms: Math.round(performance.now() - started) }
      } catch {
        return { name, status: 0, ok: false, ms: Math.round(performance.now() - started) }
      }
    }),
  )
}
export async function run({ stateFile = '.artifacts/monitor/monitor-state.json', fetcher = fetch } = {}) {
  let previous = null
  try {
    previous = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
  } catch {}
  const checks = await probe(fetcher),
    state = transition(previous, checks)
  fs.mkdirSync(path.dirname(stateFile), { recursive: true })
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2))
  console.log(
    JSON.stringify({
      at: state.at,
      incident: state.incident,
      failures: state.failures,
      checks: state.checks,
    }),
  )
  return { state }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { state } = await run()
  if (state.incident) process.exitCode = 1
}
