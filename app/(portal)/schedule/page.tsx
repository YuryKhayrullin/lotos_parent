import { PortalPage, type PortalSearchParams } from '@/components/portal/portal-page'
import { ScheduleView } from '@/components/schedule/schedule-view'

export default function SchedulePage({ searchParams }: { searchParams: PortalSearchParams }) {
  return (
    <PortalPage searchParams={searchParams}>
      <ScheduleView />
    </PortalPage>
  )
}
