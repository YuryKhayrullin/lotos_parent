import { PortalPage, type PortalSearchParams } from '@/components/portal/portal-page'
import { SubscriptionView } from '@/components/subscription/subscription-view'

export default function SubscriptionPage({ searchParams }: { searchParams: PortalSearchParams }) {
  return (
    <PortalPage searchParams={searchParams}>
      <SubscriptionView />
    </PortalPage>
  )
}
