import { BookingShell } from '@/components/booking/booking-shell'
import { BranchPicker } from '@/components/booking/branch-picker'
import { crmJson } from '@/lib/server/crm-api'
import type { BookingBranch } from '@/lib/booking-contracts'
export const dynamic = 'force-dynamic'
export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string | string[] }>
}) {
  const query = await searchParams
  const city = typeof query.city === 'string' && query.city.length <= 100 ? query.city : ''
  const { branches } = await crmJson<{ branches: BookingBranch[] }>('booking/catalog', new Headers())
  return (
    <BookingShell step="Шаг 2 · Филиал">
      <BranchPicker branches={branches.filter((branch) => !city || branch.city === city)} city={city} />
    </BookingShell>
  )
}
