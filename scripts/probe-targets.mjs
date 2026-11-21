const crm = 'https://lotos-crm-staging.vercel.app'
const parent = 'https://lotos-parent-inky.vercel.app'

export const maxProbeBodyBytes = 1024 * 1024

export const probeTargets = {
  'crm-live': { url: crm + '/api/health/live', kind: 'health', status: 'ok' },
  'crm-ready': { url: crm + '/api/health/ready', kind: 'health', status: 'ready' },
  'crm-document': { url: crm + '/', kind: 'html' },
  'parent-health': { url: parent + '/api/health', kind: 'health', status: 'ok' },
  'parent-catalog': { url: parent + '/api/parent/booking/v2/catalog', kind: 'catalog' },
  'parent-trial': { url: parent + '/select-city?source=yandex_maps', kind: 'trial' },
  'backup-freshness': { url: crm + '/api/health/backups', kind: 'health', status: 'ok' },
}

export function healthyResponse(target, status, contentType, body) {
  if (status !== 200) return false
  if (target.kind === 'trial' || target.kind === 'html') {
    return (
      /^text\/html(?:;|$)/i.test(contentType) &&
      (target.kind === 'html' ||
        (/<main\b[^>]*\bdata-trial-entry(?:[\s=>])/i.test(body) &&
          /<button\b[^>]*\baria-haspopup="dialog"/i.test(body)))
    )
  }
  if (!/^application\/json(?:;|$)/i.test(contentType)) return false
  if (target.kind === 'health') return body?.status === target.status
  return (
    target.kind === 'catalog' &&
    body?.schemaVersion === 2 &&
    Array.isArray(body.branches) &&
    body.branches.length > 0 &&
    body.branches.every(
      (branch) =>
        typeof branch?.id === 'string' &&
        Boolean(branch.id) &&
        typeof branch.name === 'string' &&
        Boolean(branch.name.trim()),
    )
  )
}

export async function readProbeBody(response) {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks = []
  let bytes = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return Buffer.concat(chunks, bytes).toString('utf8')
      bytes += value.byteLength
      if (bytes > maxProbeBodyBytes) {
        await reader.cancel()
        throw new Error('Probe response exceeds the size limit')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
}
