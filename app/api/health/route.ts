import { crmReady } from '@/lib/server/crm-api'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const ready = await crmReady()
    return Response.json(
      { status: ready ? 'ok' : 'unavailable' },
      {
        status: ready ? 200 : 503,
        headers: { 'cache-control': 'no-store' },
      },
    )
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}
