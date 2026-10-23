'use client'
import { BookingShell } from '@/components/booking/booking-shell'
export default function BookingError({ reset }: { reset: () => void }) {
  return (
    <BookingShell>
      <h1 className="text-2xl font-bold">Каталог временно недоступен</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Не удалось получить данные клуба. Попробуйте ещё раз через несколько секунд.
      </p>
      <button onClick={reset} className="mt-5 min-h-12 rounded-2xl bg-cyan-700 px-5 font-semibold text-white">
        Попробовать снова
      </button>
    </BookingShell>
  )
}
