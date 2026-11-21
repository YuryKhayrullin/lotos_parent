import { PortalPage, type PortalSearchParams } from '@/components/portal/portal-page'
import { AbsencesView } from '@/components/absences/absences-view'

export default function AbsencesPage({ searchParams }: { searchParams: PortalSearchParams }) {
  return (
    <PortalPage searchParams={searchParams}>
      <AbsencesView />
    </PortalPage>
  )
}
