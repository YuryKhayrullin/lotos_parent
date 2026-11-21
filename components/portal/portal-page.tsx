import { parseCalendarDay } from '@/lib/contracts'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PortalProvider } from '@/components/portal/portal-provider'
import { PortalShell } from '@/components/portal/portal-shell'
import { parentBootstrap } from '@/lib/server/crm-api'
import { ConnectionUnavailable } from '@/components/connection-unavailable'
import { ApiError, isConnectionFailure } from '@/lib/server/errors'
async function bootstrap(child: string, week: string) {
  try {
    return await parentBootstrap(new Headers(await headers()), child, week)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
export type PortalSearchParams = Promise<Record<string, string | string[] | undefined>>

export async function PortalPage({
  children,
  searchParams,
}: {
  children: React.ReactNode
  searchParams: PortalSearchParams
}) {
  const query = await searchParams
  const child = typeof query.child === 'string' ? query.child : ''
  const week = parseCalendarDay(typeof query.week === 'string' ? query.week : undefined)
  let data
  try {
    data = await bootstrap(child, week)
  } catch (error) {
    if (isConnectionFailure(error)) return <ConnectionUnavailable error={error} />
    throw error
  }
  if (!data) redirect('/login')
  return (
    <PortalProvider
      initialUser={data.user}
      initialChildren={data.children}
      initialOverview={data.overview}
      initialWeek={week}
    >
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  )
}
