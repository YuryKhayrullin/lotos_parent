import { PortalPage, type PortalSearchParams } from '@/components/portal/portal-page'
import { AttendanceView } from '@/components/attendance/attendance-view'

export default function AttendancePage({ searchParams }: { searchParams: PortalSearchParams }) {
  return (
    <PortalPage searchParams={searchParams}>
      <AttendanceView />
    </PortalPage>
  )
}
