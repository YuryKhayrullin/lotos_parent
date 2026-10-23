import { BookingShell } from '@/components/booking/booking-shell'
export default function BookingLoading() {
  return (
    <BookingShell>
      <div role="status" aria-label="Загружаем филиалы" className="space-y-4 motion-safe:animate-pulse">
        <div className="h-8 w-3/4 rounded-xl bg-slate-100" />
        {[0, 1, 2].map((value) => (
          <div key={value} className="h-24 rounded-2xl bg-slate-100" />
        ))}
        <span className="sr-only">Загружаем данные клуба…</span>
      </div>
    </BookingShell>
  )
}
