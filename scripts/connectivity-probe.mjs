import { spawnSync } from 'node:child_process'
import { promises as dns } from 'node:dns'
import fs from 'node:fs'

const targets = [
  ['crm-live', 'https://lotos-crm-staging.vercel.app/api/health/live'],
  ['crm-ready', 'https://lotos-crm-staging.vercel.app/api/health/ready'],
  ['crm-document', 'https://lotos-crm-staging.vercel.app/'],
  ['parent-health', 'https://lotos-parent-inky.vercel.app/api/health'],
  ['parent-catalog', 'https://lotos-parent-inky.vercel.app/api/parent/booking/catalog'],
]
const resolvers = {}
for (const [, url] of targets) {
  const host = new URL(url).hostname
  if (!resolvers[host]) {
    try {
      resolvers[host] = await dns.lookup(host, { all: true })
    } catch {
      resolvers[host] = []
    }
  }
}
const samples = []
for (let round = 1; round <= 2; round++) {
  for (const [name, url] of targets) {
    const result = spawnSync(
      'curl',
      [
        '--noproxy',
        '*',
        '--connect-timeout',
        '4',
        '--max-time',
        '7',
        '--silent',
        '--show-error',
        '--output',
        '/dev/null',
        '--write-out',
        '%{json}',
        url,
      ],
      { encoding: 'utf8', timeout: 9000, maxBuffer: 1024 * 1024 },
    )
    let value = {}
    try {
      value = JSON.parse(result.stdout)
    } catch {}
    const sample = {
      name,
      round,
      exit: result.status,
      status: value.http_code || 0,
      remoteIp: value.remote_ip || null,
      dnsMs: Math.round((value.time_namelookup || 0) * 1000),
      tcpMs: Math.round((value.time_connect || 0) * 1000),
      tlsMs: Math.round((value.time_appconnect || 0) * 1000),
      ttfbMs: Math.round((value.time_starttransfer || 0) * 1000),
      totalMs: Math.round((value.time_total || 0) * 1000),
      bytes: value.size_download || 0,
      ok: result.status === 0 && value.http_code === 200,
    }
    samples.push(sample)
    console.log(JSON.stringify(sample))
  }
}
const report = {
  at: new Date().toISOString(),
  network: process.env.GITHUB_ACTIONS === 'true' ? 'GitHub Actions runner' : 'Operator network',
  routing: 'Normal system DNS; no proxy, IP override, cookies or authentication',
  note: 'Two sequential observations per endpoint; not proof of availability in every trainer network',
  resolvers,
  samples,
}
fs.mkdirSync('.artifacts/connectivity', { recursive: true })
fs.writeFileSync('.artifacts/connectivity/timings.json', JSON.stringify(report, null, 2))
if (samples.some((sample) => !sample.ok)) process.exitCode = 1
