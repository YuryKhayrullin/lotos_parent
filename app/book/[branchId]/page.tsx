import { notFound } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import { BookingShell } from '@/components/booking/booking-shell'
import { BranchServices } from '@/components/booking/branch-services'
import { BookingLessons } from '@/components/booking/booking-lessons'
import { crmJson } from '@/lib/server/crm-api'
import {
  bookingBranchUrl,
  bookingCityUrl,
  type BookingBranch,
  type BookingLesson,
} from '@/lib/booking-contracts'
export const dynamic = 'force-dynamic'
export default async function BranchPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>
  searchParams: Promise<{ service?: string | string[] }>
}) {
  const { branchId } = await params
  const { branches } = await crmJson<{ branches: BookingBranch[] }>('booking/catalog', new Headers())
  const branch = branches.find((item) => item.id === branchId)
  if (!branch) notFound()
  const { service } = await searchParams
  if (
    service !== undefined &&
    (typeof service !== 'string' || !['group', 'individual', 'subscription'].includes(service))
  )
    notFound()
  const lessons =
    service === 'group' || service === 'individual'
      ? await crmJson<{ lessons: BookingLesson[]; bookingEnabled: boolean }>(
          'booking/branches/' + encodeURIComponent(branch.id) + '/lessons',
          new Headers(),
        )
      : null
  return (
    <BookingShell
      back={service ? bookingBranchUrl(branch.id) : bookingCityUrl(branch.city)}
      step={service ? 'Шаг 4 · Занятия' : 'Шаг 3 · Услуги'}
    >
      {!service ? (
        <BranchServices branch={branch} />
      ) : service === 'subscription' ? (
        <>
          <CreditCard className="mb-4 text-cyan-700" size={32} />
          <h1 className="text-2xl font-bold">Абонементы</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Остаток занятий и история оплат доступны в кабинете родителя. Онлайн-покупка абонемента пока не
            открыта.
          </p>
          <a
            href="/login"
            className="mt-6 flex min-h-12 items-center justify-center rounded-2xl bg-cyan-700 px-5 font-semibold text-white"
          >
            Войти в кабинет
          </a>
        </>
      ) : (
        <>
          <p className="mb-4 text-xs font-medium text-cyan-700">
            {branch.city} · {branch.name}
          </p>
          <BookingLessons
            lessons={lessons!.lessons}
            bookingEnabled={lessons!.bookingEnabled}
            individual={service === 'individual'}
          />
        </>
      )}
    </BookingShell>
  )
}
