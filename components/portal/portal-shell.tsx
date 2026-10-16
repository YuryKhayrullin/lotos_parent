'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, ClipboardCheck, CreditCard, Home, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { ageYears, dateLabel, localDay } from '@/lib/contracts'
import { Brand } from '@/components/ui/brand'
import { usePortal } from './portal-provider'

const navigation = [
  { path: '/', label: 'Главная', icon: Home },
  { path: '/schedule', label: 'Расписание', icon: CalendarDays },
  { path: '/attendance', label: 'Посещаемость', icon: ClipboardCheck },
  { path: '/subscription', label: 'Абонемент', icon: CreditCard },
] as const

export function PortalShell({ children }: { children: React.ReactNode }) {
  const portal = usePortal()
  const pathname = usePathname()
  const today = localDay(portal.selectedChild?.timeZone || 'Europe/Moscow')
  const age = ageYears(portal.selectedChild?.birthDate || null, today)
  const firstName = portal.user.name.trim().split(/\s+/)[0] || 'Родитель'
  const current = navigation.find((item) => item.path === pathname) ?? navigation[0]

  return (
    <main className="min-h-dvh bg-[var(--color-canvas)]">
      <div className="mx-auto flex min-h-dvh max-w-[1680px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 xl:flex">
          <div className="mb-8 px-2 py-2">
            <Brand />
          </div>
          <p className="mb-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Разделы
          </p>
          <nav aria-label="Разделы кабинета родителя" className="flex flex-grow flex-col gap-1">
            {navigation.map(({ path, label, icon: Icon }) => {
              const active = current.path === path
              return (
                <Link
                  key={path}
                  href={portal.hrefFor(path, { keepWeek: path === '/schedule' })}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ' +
                    (active
                      ? 'bg-cyan-50 font-semibold text-cyan-800'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
                  }
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <span className="size-1.5 rounded-full bg-cyan-600" />}
                </Link>
              )
            })}
          </nav>
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="size-4 text-cyan-700" />
              Данные под защитой
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Вы видите только карточки детей, которые подтвердил клуб.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-800">
              {portal.user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{portal.user.name}</p>
              <p className="text-xs text-slate-400">Родитель</p>
            </div>
            <button
              type="button"
              onClick={() => void portal.logout()}
              aria-label="Выйти из кабинета"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-md sm:px-8">
            <div className="mb-4 xl:hidden">
              <Brand />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs capitalize text-slate-500">{dateLabel(today, true)}</p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {pathname === '/' ? 'Добрый день, ' + firstName : current.label}
                </h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={portal.refresh}
                  disabled={portal.refreshing || portal.loading}
                  aria-label="Обновить данные"
                  className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={18} className={portal.refreshing ? 'animate-spin' : undefined} />
                </button>
                <button
                  type="button"
                  onClick={() => void portal.logout()}
                  aria-label="Выйти из кабинета"
                  className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 xl:hidden"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="w-full flex-1 px-4 pb-28 pt-6 sm:px-8 xl:pb-12">
            {portal.selectedChild && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 font-semibold text-cyan-800">
                  {portal.selectedChild.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Сейчас вы смотрите
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {portal.selectedChild.name}
                    {age !== null && <span className="ml-2 font-normal text-slate-500">· {age} лет</span>}
                  </p>
                </div>
                {portal.children.length > 1 && (
                  <label>
                    <span className="sr-only">Выбрать ребёнка</span>
                    <select
                      value={portal.selectedId}
                      onChange={(event) => portal.selectChild(event.target.value)}
                      className="min-h-11 max-w-40 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium"
                    >
                      {portal.children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>

      <nav
        aria-label="Мобильные разделы"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex rounded-2xl border border-slate-200 bg-white p-2 shadow-[var(--shadow-float)] xl:hidden"
      >
        {navigation.map(({ path, label, icon: Icon }) => {
          const active = current.path === path
          return (
            <Link
              key={path}
              href={portal.hrefFor(path, { keepWeek: path === '/schedule' })}
              aria-current={active ? 'page' : undefined}
              className={
                'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.62rem] font-medium ' +
                (active ? 'bg-cyan-50 text-cyan-800' : 'text-slate-500')
              }
            >
              <Icon size={19} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>
    </main>
  )
}
