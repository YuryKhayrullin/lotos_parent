import { PortalPage, type PortalSearchParams } from '@/components/portal/portal-page'
import { DashboardView } from '@/components/dashboard/dashboard-view'

export default function DashboardPage({ searchParams }: { searchParams: PortalSearchParams }) {
  return (
    <PortalPage searchParams={searchParams}>
      <DashboardView />
    </PortalPage>
  )
}
