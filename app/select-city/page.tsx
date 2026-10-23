import { ChevronRight, MapPin } from 'lucide-react'
import { BookingShell } from '@/components/booking/booking-shell'
import { crmJson } from '@/lib/server/crm-api'
import { bookingCityUrl, type BookingBranch } from '@/lib/booking-contracts'
export const dynamic = 'force-dynamic'
export default async function SelectCityPage() {
  const { branches } = await crmJson<{ branches: BookingBranch[] }>('booking/catalog', new Headers())
  const cities = [...new Set(branches.map((branch) => branch.city))].sort((a, b) => a.localeCompare(b, 'ru'))
  return (
    <BookingShell back="/login" step="Шаг 1 · Город">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">В каком городе будем плавать?</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Выберите город, затем удобный бассейн и занятие.
      </p>
      <div className="mt-6 space-y-3">
        {cities.map((city) => (
          <a
            key={city}
            href={bookingCityUrl(city)}
            className="flex min-h-20 items-center gap-4 rounded-2xl border border-slate-200 p-4 hover:border-cyan-300 hover:bg-cyan-50/40"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <MapPin size={22} />
            </span>
            <span className="min-w-0 flex-1 break-words font-semibold">
              {city}
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Филиалов: {branches.filter((branch) => branch.city === city).length}
              </span>
            </span>
            <ChevronRight size={20} className="text-slate-300" />
          </a>
        ))}
      </div>
      {!cities.length && (
        <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          Онлайн-каталог филиалов пока не открыт. Если вы уже занимаетесь в клубе, войдите в личный кабинет.
        </p>
      )}
    </BookingShell>
  )
}
