import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PortalProvider } from '@/components/portal/portal-provider'
import { PortalShell } from '@/components/portal/portal-shell'
import { parentBootstrap } from '@/lib/server/crm-api'
import { ConnectionUnavailable } from '@/components/connection-unavailable'
import { ApiError, isConnectionFailure } from '@/lib/server/errors'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
async function bootstrap() {
  try {
    return await parentBootstrap(new Headers(await headers()))
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let data
  try {
    data = await bootstrap()
  } catch (error) {
    if (isConnectionFailure(error)) return <ConnectionUnavailable error={error} />
    throw error
  }
  if (!data) redirect('/login')
  return (
    <PortalProvider initialUser={data.user} initialChildren={data.children} initialOverview={data.overview}>
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  )
}
