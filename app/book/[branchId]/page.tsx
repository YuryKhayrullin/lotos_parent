import { notFound } from 'next/navigation'
import { BookingShell } from '@/components/booking/booking-shell'
import { PoolCard } from '@/components/booking/pool-card'
import { crmJson } from '@/lib/server/crm-api'
import { bookingDaySchema, bookingCategorySchema, type CatalogV2 } from '@/lib/booking-v2'
export const dynamic = 'force-dynamic'
export default async function BranchPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { branchId } = await params
  const input = await searchParams
  if (input.service && !['group', 'individual', 'subscription'].includes(String(input.service))) notFound()
  const catalog = await crmJson<CatalogV2>(
    'booking/v2/catalog?' + new URLSearchParams({ branchId, limit: '1' }),
    new Headers(),
  )
  const branch = catalog.branches.find((b) => b.id === branchId)
  if (!branch) notFound()
  const date = bookingDaySchema.safeParse(input.date),
    category = bookingCategorySchema.safeParse(input.category)
  const lesson = typeof input.lesson === 'string' && input.lesson.length <= 100 ? input.lesson : ''
  const context = {
    q: typeof input.q === 'string' ? input.q.slice(0, 150) : '',
    city: typeof input.city === 'string' ? input.city.slice(0, 100) : '',
    source: input.source === 'yandex_maps' ? ('yandex_maps' as const) : undefined,
  }
  const back = new URLSearchParams()
  if (date.success) back.set('date', date.data)
  if (category.success) back.set('category', category.data)
  if (context.q) back.set('q', context.q)
  if (context.city) back.set('city', context.city)
  if (context.source) back.set('source', context.source)
  return (
    <BookingShell wide back={'/select-city' + (back.size ? '?' + back : '')} step="Выбор занятия и запись">
      <div className="mx-auto max-w-2xl">
        {input.service === 'subscription' ? (
          <div className="rounded-3xl bg-white p-6">
            <h1 className="text-2xl font-bold">Абонементы</h1>
            <p className="mt-3">
              Онлайн-покупка пока не открыта. Остаток занятий доступен в кабинете родителя.
            </p>
            <a className="mt-4 inline-flex min-h-12 items-center text-cyan-700 underline" href="/login">
              Войти в кабинет
            </a>
          </div>
        ) : input.service === 'individual' ? (
          <div className="rounded-3xl bg-white p-6">
            <h1 className="text-2xl font-bold">Индивидуальные занятия</h1>
            <p className="mt-3">Доступных индивидуальных услуг пока нет. Свяжитесь с клубом.</p>
          </div>
        ) : (
          <PoolCard
            branch={branch}
            generatedAt={catalog.generatedAt}
            initialDate={date.success ? date.data : ''}
            initialCategory={category.success ? category.data : 'all'}
            initialLesson={lesson}
            detail
            context={context}
          />
        )}
      </div>
    </BookingShell>
  )
}
