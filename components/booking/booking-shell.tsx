import { ArrowLeft, UserRound, Waves } from 'lucide-react'
export function BookingShell({
  children,
  back = '/select-city',
  step = 'Онлайн-запись',
}: {
  children: React.ReactNode
  back?: string
  step?: string
}) {
  return (
    <main className="min-h-dvh bg-[var(--color-canvas)] px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-center justify-between gap-3 px-1 sm:mb-8">
          <a href="/select-city" className="flex items-center gap-3" aria-label="Лотос — выбор города">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-700 text-white shadow-lg shadow-cyan-900/10">
              <Waves size={25} />
            </span>
            <span>
              <span className="block text-xl font-extrabold tracking-tight">
                Лотос<span className="text-cyan-600">.</span>
              </span>
              <span className="block text-xs text-slate-500">Запись в клуб</span>
            </span>
          </a>
          <a
            href="/login"
            aria-label="Личный кабинет"
            className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:border-cyan-300"
          >
            <UserRound size={17} />
            <span className="hidden min-[360px]:inline">Личный кабинет</span>
          </a>
        </header>
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.035]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-8">
            <a
              href={back}
              aria-label="Назад"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={19} />
            </a>
            <p className="text-sm font-medium text-slate-500">{step}</p>
          </div>
          <div className="p-5 sm:p-8">{children}</div>
        </section>
        <p className="py-6 text-center text-xs text-slate-400">Лотос · плавание и синхронное плавание</p>
      </div>
    </main>
  )
}
