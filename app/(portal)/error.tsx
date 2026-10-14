'use client'

import { ErrorState } from '@/components/ui/portal-ui'

export default function PortalError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState message="Кабинет временно недоступен. Повторите попытку." retry={reset} />
}
