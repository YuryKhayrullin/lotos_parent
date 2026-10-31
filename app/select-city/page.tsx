import { BookingShell } from '@/components/booking/booking-shell'
import { PoolDirectory } from '@/components/booking/pool-directory'
import { crmJson } from '@/lib/server/crm-api'
import { bookingCategorySchema, bookingDaySchema, type CatalogV2 } from '@/lib/booking-v2'
export const dynamic = 'force-dynamic'
export default async function SelectCityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const input = await searchParams
  const source = input.source === 'yandex_maps' ? 'yandex_maps' : undefined
  const q = typeof input.q === 'string' ? input.q.trim().slice(0, 150) : ''
  const city = typeof input.city === 'string' ? input.city.trim().slice(0, 100) : ''
  const date = bookingDaySchema.safeParse(input.date)
  const category = bookingCategorySchema.safeParse(input.category)
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (city) params.set('city', city)
  const catalog = await crmJson<CatalogV2>('booking/v2/catalog?' + params, new Headers())
  return (
    <BookingShell wide back="/login" step="Бассейн → дата → запись">
      <PoolDirectory
        initial={catalog}
        q={q}
        city={city}
        date={date.success ? date.data : ''}
        category={category.success ? category.data : 'all'}
        source={source}
      />
    </BookingShell>
  )
}
