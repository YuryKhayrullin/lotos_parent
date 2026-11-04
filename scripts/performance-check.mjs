import https from 'node:https'
import fs from 'node:fs'
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'

// Engineering budgets for bounded public reads, not a contractual SLA.
export const targets = [
  ['crm-live', 'https://lotos-crm-staging.vercel.app/api/health/live', 1500, 3000],
  ['crm-ready', 'https://lotos-crm-staging.vercel.app/api/health/ready', 2500, 5000],
  ['parent-health', 'https://lotos-parent-inky.vercel.app/api/health', 3000, 5000],
  ['parent-catalog', 'https://lotos-parent-inky.vercel.app/api/parent/booking/catalog', 3000, 5000],
]
export function summarize(samples, p95Budget, p99Budget) {
  const sorted = samples
    .filter((s) => s.ok)
    .map((s) => s.ms)
    .sort((a, b) => a - b)
  const percentile = (p) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? null
  const errors = samples.length - sorted.length
  const p95 = percentile(0.95),
    p99 = percentile(0.99)
  return {
    requests: samples.length,
    errors,
    p50: percentile(0.5),
    p95,
    p99,
    budget: { p95: p95Budget, p99: p99Budget },
    passed: samples.length >= 100 && errors === 0 && p95 <= p95Budget && p99 <= p99Budget,
  }
}
function sample(url, agent) {
  return new Promise((resolve) => {
    const start = performance.now()
    let finished = false,
      request,
      deadline
    const result = {
      status: 0,
      ok: false,
      ms: 0,
      tcpMs: null,
      tlsMs: null,
      ttfbMs: null,
      reusedSocket: false,
    }
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(deadline)
      result.ms = Math.round(performance.now() - start)
      resolve(result)
    }
    request = https.get(url, { agent, family: 4, headers: { 'cache-control': 'no-cache' } }, (response) => {
      result.status = response.statusCode
      result.reusedSocket = request.reusedSocket
      result.ttfbMs = Math.round(performance.now() - start)
      let length = 0
      const chunks = []
      response.on('data', (chunk) => {
        length += chunk.length
        if (length > 1024 * 1024) {
          request.destroy()
          return
        }
        chunks.push(chunk)
      })
      response.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          result.ok =
            response.statusCode === 200 &&
            (url.endsWith('/catalog')
              ? Array.isArray(body?.branches)
              : body?.status === (url.endsWith('/ready') ? 'ready' : 'ok'))
          const release = response.headers['x-lotos-parent-release'] || body?.release
          if (/^[a-f0-9]{7,40}$/.test(release || '')) result.release = release
        } catch {}
        finish()
      })
      response.on('aborted', finish)
      response.on('error', finish)
    })
    deadline = setTimeout(() => {
      request.destroy()
      finish()
    }, 12000)
    request.on('socket', (socket) => {
      if (socket.connecting) {
        socket.once('connect', () => {
          result.tcpMs = Math.round(performance.now() - start)
        })
        socket.once('secureConnect', () => {
          result.tlsMs = Math.round(performance.now() - start)
        })
      }
    })
    request.on('error', finish)
  })
}
export async function run() {
  const reports = []
  for (const [name, url, p95Budget, p99Budget] of targets) {
    const agent = new https.Agent({ keepAlive: true, maxSockets: 4 })
    const first = await sample(url, agent),
      samples = []
    // 100 measured reads, four at a time. No cookies, auth, SMTP or database writes.
    for (let round = 0; round < 25; round++)
      samples.push(...(await Promise.all(Array.from({ length: 4 }, () => sample(url, agent)))))
    agent.destroy()
    reports.push({ name, first, ...summarize(samples, p95Budget, p99Budget), samples })
  }
  const report = {
    at: new Date().toISOString(),
    concurrency: 4,
    routing: 'Normal system DNS; no IP override',
    note: 'First request is recorded separately; no assertion that Vercel scheduled a cold instance.',
    passed: reports.every((r) => r.passed),
    reports,
  }
  fs.mkdirSync('.artifacts/performance', { recursive: true })
  fs.writeFileSync('.artifacts/performance/report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, reports: reports.map(({ samples, ...r }) => r) }))
  return report
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!(await run()).passed) process.exitCode = 1
}
