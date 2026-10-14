'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Home,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Waves,
} from 'lucide-react'
import { ageYears, dateLabel, localDay } from '@/lib/contracts'
import { usePortal } from './portal-provider'
import { Eyebrow } from '@/components/ui/portal-ui'

const navigation = [
  { path: '/', label: 'Главная', icon: Home },
  { path: '/schedule', label: 'Расписание', icon: CalendarDays },
  { path: '/attendance', label: 'Посещаемость', icon: ClipboardCheck },
  { path: '/subscription', label: 'Абонемент', icon: CreditCard },
] as const

function Brand({ dark = true }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-white shadow-lg shadow-purple-950/15">
        <Waves size={25} />
      </span>
      <div>
        <p
          className={
            'text-[0.58rem] font-extrabold uppercase tracking-[0.24em] ' +
            (dark ? 'text-[#9eb8d0]' : 'text-[var(--color-muted)]')
          }
        >
          Sport Club
        </p>
        <p
          className={
            'text-xl font-black tracking-[-0.035em] ' + (dark ? 'text-white' : 'text-[var(--color-navy)]')
          }
        >
          Лотос
        </p>
      </div>
    </div>
  )
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const portal = usePortal()
  const pathname = usePathname()
  const relativePath = portal.basePath ? pathname.slice(portal.basePath.length) || '/' : pathname
  const today = localDay(portal.selectedChild?.timeZone || 'Europe/Moscow')
  const age = ageYears(portal.selectedChild?.birthDate || null, today)
  const firstName = portal.user.name.trim().split(/\s+/)[0] || 'Родитель'
  const current = navigation.find((item) => item.path === relativePath) ?? navigation[0]

  return (
    <main className="min-h-dvh bg-[var(--color-canvas)]">
      <div className="mx-auto flex min-h-dvh max-w-[1440px]">
        <aside className="hidden w-[248px] shrink-0 flex-col bg-[var(--color-navy)] px-6 py-8 text-white lg:flex">
          <Brand />
          <p className="mb-6 mt-11 px-3 text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-[#87a5c0]">
            Кабинет родителя
          </p>
          <nav aria-label="Основные разделы" className="space-y-2">
            {navigation.map(({ path, label, icon: Icon }) => {
              const active = current.path === path
              return (
                <Link
                  key={path}
                  href={portal.hrefFor(path, { keepWeek: path === '/schedule' })}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-colors ' +
                    (active
                      ? 'bg-white text-[var(--color-navy)] shadow-md'
                      : 'text-[#b9ccdd] hover:bg-white/10 hover:text-white')
                  }
                >
                  <Icon size={19} />
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto rounded-[1.35rem] bg-[var(--color-navy-soft)] p-4">
            <p className="flex items-center gap-2 text-xs font-bold">
              <ShieldCheck size={17} />
              Данные под защитой
            </p>
            <p className="mt-2 text-[0.7rem] leading-5 text-[#acc3d8]">
              Вы видите только карточки детей, которые подтвердил клуб.
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{portal.user.name}</p>
              <p className="mt-1 text-[0.68rem] text-[#9eb8d0]">Родитель</p>
            </div>
            <button
              type="button"
              onClick={() => void portal.logout()}
              aria-label="Выйти из кабинета"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#c8d7e5]"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-7 lg:px-10 lg:pb-12 lg:pt-8">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-5 lg:hidden">
                <Brand dark={false} />
              </div>
              <p className="text-xs capitalize text-[var(--color-muted)]">{dateLabel(today, true)}</p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                {relativePath === '/' ? 'Добрый день, ' + firstName : current.label}
              </h1>
            </div>
            <div className="flex items-center gap-2 pt-16 lg:pt-0">
              <button
                type="button"
                onClick={portal.refresh}
                disabled={portal.refreshing || portal.loading}
                aria-label="Обновить данные"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-ink-soft)] disabled:opacity-50"
              >
                <RefreshCw size={18} className={portal.refreshing ? 'animate-spin' : undefined} />
              </button>
              <button
                type="button"
                onClick={() => void portal.logout()}
                aria-label="Выйти из кабинета"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-ink-soft)] lg:hidden"
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>

          {portal.preview && (
            <p className="mb-4 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-xs font-bold text-purple-800">
              Предпросмотр · примерные данные, доступен только локально
            </p>
          )}

          {portal.selectedChild && (
            <div className="mb-5 flex items-center gap-3 rounded-[1.4rem] bg-[var(--color-surface-soft)] px-4 py-4 sm:px-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d5e6f4] font-black text-[var(--color-navy)]">
                {portal.selectedChild.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <Eyebrow>Сейчас вы смотрите</Eyebrow>
                <p className="mt-1 truncate text-sm font-extrabold">
                  {portal.selectedChild.name}
                  {age !== null && (
                    <span className="ml-2 font-normal text-[var(--color-muted)]">· {age} лет</span>
                  )}
                </p>
              </div>
              {portal.children.length > 1 && (
                <label>
                  <span className="sr-only">Выбрать ребёнка</span>
                  <select
                    value={portal.selectedId}
                    onChange={(event) => portal.selectChild(event.target.value)}
                    className="min-h-11 max-w-40 rounded-full border border-[var(--color-line)] bg-white px-3 text-xs font-bold"
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
        </section>
      </div>

      <nav
        aria-label="Мобильные разделы"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex rounded-[1.5rem] bg-[var(--color-navy)] p-2 shadow-[var(--shadow-float)] lg:hidden"
      >
        {navigation.map(({ path, label, icon: Icon }) => {
          const active = current.path === path
          return (
            <Link
              key={path}
              href={portal.hrefFor(path, { keepWeek: path === '/schedule' })}
              aria-current={active ? 'page' : undefined}
              className={
                'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.62rem] font-bold ' +
                (active ? 'bg-white text-[var(--color-navy)]' : 'text-[#b9ccdd]')
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
