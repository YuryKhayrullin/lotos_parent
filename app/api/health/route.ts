import { crmReady } from '@/lib/server/crm-api'
import { releaseIdentifier } from '@/lib/server/parent-route-policy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ready = await crmReady()
    return Response.json(
      { status: ready ? 'ok' : 'unavailable', release: releaseIdentifier() },
      {
        status: ready ? 200 : 503,
        headers: { 'cache-control': 'no-store' },
      },
    )
  } catch {
    return Response.json(
      { status: 'unavailable', release: releaseIdentifier() },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }
}
