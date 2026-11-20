import { Suspense } from 'react'
import Image from 'next/image'
import { BookingBackLink } from './booking-back-link'
import { UserRound, Waves } from 'lucide-react'
export function BookingShell({
  children,
  back = '/select-city',
  step = 'Онлайн-запись',
  wide = false,
  showAccountLink = true,
}: {
  children: React.ReactNode
  back?: string
  step?: string | null
  wide?: boolean
  showAccountLink?: boolean
}) {
  const trial = step === null

  return (
    <main
      className="min-h-dvh bg-[var(--color-canvas)] px-3 py-4 sm:px-6 sm:py-8"
      data-trial-entry={trial ? '' : undefined}
    >
      <div className={wide ? 'mx-auto max-w-7xl' : 'mx-auto max-w-3xl'}>
        <header className="mb-5 flex items-center justify-between gap-3 px-1 sm:mb-8">
          <a
            href={trial ? '/select-city?source=yandex_maps' : '/select-city'}
            className="flex min-w-0 items-center gap-2.5"
            aria-label="Лотос — выбрать бассейн"
          >
            {trial ? (
              <Image
                src="/brand/lotos-club-logo.png"
                width={48}
                height={47}
                alt=""
                unoptimized
                className="h-auto w-12 shrink-0"
              />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-700 text-white shadow-lg shadow-cyan-900/10">
                <Waves size={25} />
              </span>
            )}
            <span>
              <span
                className={
                  trial
                    ? 'block text-lg font-semibold tracking-tight'
                    : 'block text-xl font-extrabold tracking-tight'
                }
              >
                Лотос<span className="text-cyan-600">.</span>
              </span>
              <span className="block text-xs text-slate-500">
                {trial ? 'Пробное занятие' : 'Запись в клуб'}
              </span>
            </span>
          </a>
          {!trial && showAccountLink && (
            <a
              href="/login"
              aria-label="Личный кабинет"
              className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:border-cyan-300"
            >
              <UserRound size={17} aria-hidden="true" />
              <span className="hidden min-[360px]:inline">Личный кабинет</span>
            </a>
          )}
        </header>
        <section
          className={
            wide
              ? ''
              : 'overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.035]'
          }
        >
          {!trial && (
            <div
              className={
                wide
                  ? 'mb-4 flex items-center gap-3'
                  : 'flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-8'
              }
            >
              <Suspense
                fallback={
                  <a href={back} className="min-h-11 text-sm text-cyan-700">
                    Назад
                  </a>
                }
              >
                <BookingBackLink fallback={back} />
              </Suspense>
              <p className="text-sm font-medium text-slate-500">{step}</p>
            </div>
          )}
          <div className={wide ? '' : 'p-5 sm:p-8'}>{children}</div>
        </section>
        <p className="py-6 text-center text-xs text-slate-400">Лотос · занятия в воде и зале</p>
      </div>
    </main>
  )
}
