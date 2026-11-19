'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, MapPin, Search } from 'lucide-react'
import { PoolCard } from './pool-card'
import { TrialPoolCard, TrialPoolDialog } from './trial-pool-card'
import { bookingApi, type CatalogV2, type PublicBranch } from '@/lib/booking-v2'
import { requestJson } from '@/lib/api-client'
import type { TrialRequestConsent } from '@/lib/trial-request'
export function PoolDirectory({
  initial,
  q = '',
  city = '',
  date = '',
  category = 'all',
  source,
  trialConsent = null,
}: {
  initial: CatalogV2
  q?: string
  city?: string
  date?: string
  category?: string
  source?: 'yandex_maps'
  trialConsent?: TrialRequestConsent | null
}) {
  const trial = source === 'yandex_maps'
  const [search, setSearch] = useState(q),
    [town, setTown] = useState(city)
  const [data, setData] = useState(initial),
    [error, setError] = useState('')
  const [retry, setRetry] = useState(0),
    [moreBusy, setMoreBusy] = useState(false)
  const [recent, setRecent] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<PublicBranch | null>(null)
  const last = useRef(JSON.stringify([q, city, 0]))
  const current = useRef('')
  const key = JSON.stringify([search.trim(), town, retry])
  current.current = key
  useEffect(() => {
    try {
      setRecent(localStorage.getItem('lotos-last-booking-branch') || '')
    } catch {}
  }, [])
  useEffect(() => {
    if (key === last.current) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setError('')
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (town) params.set('city', town)
      void requestJson<CatalogV2>(bookingApi + 'catalog?' + params, { signal: controller.signal })
        .then((next) => {
          if (!controller.signal.aborted) {
            setData(next)
            last.current = key
            const state = new URLSearchParams(params)
            if (date) state.set('date', date)
            if (category !== 'all') state.set('category', category)
            if (source) state.set('source', source)
            window.history.replaceState(null, '', '/select-city' + (state.size ? '?' + state : ''))
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setError(e instanceof Error ? e.message : 'Не удалось загрузить бассейны')
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, search, town, date, category, source])
  async function more() {
    if (!data.nextCursor || moreBusy) return
    const started = current.current
    setMoreBusy(true)
    setError('')
    const params = new URLSearchParams({ cursor: data.nextCursor })
    if (search.trim()) params.set('q', search.trim())
    if (town) params.set('city', town)
    try {
      const next = await requestJson<CatalogV2>(bookingApi + 'catalog?' + params)
      if (current.current === started)
        setData((old) => ({ ...next, branches: [...old.branches, ...next.branches] }))
    } catch (e) {
      if (current.current === started)
        setError(e instanceof Error ? e.message : 'Не удалось загрузить следующие бассейны')
    } finally {
      setMoreBusy(false)
    }
  }
  const stale = key !== last.current
  const branches = [...data.branches].sort((a, b) => (a.id === recent ? -1 : b.id === recent ? 1 : 0))
  const showCity = !trial || data.cities.length > 1 || Boolean(town)
  return (
    <div>
      {trial ? (
        <div className="relative isolate mb-4 overflow-hidden rounded-[1.625rem] border border-white bg-[radial-gradient(ellipse_at_top_right,#dcebff,transparent_72%),linear-gradient(135deg,#fff,#f4f9ff)] px-5 py-5 shadow-[0_4px_16px_rgb(20_45_75/4%)] sm:mb-6 sm:px-8 sm:py-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -bottom-40 -z-10 size-80 rounded-full border border-[#ccdefa] shadow-[0_0_0_1.5rem_#c9dfff36,0_0_0_3rem_#c9dfff25]"
          />
          <h1 className="text-[1.875rem] leading-[1.08] font-bold tracking-[-0.04em] sm:text-[2.5rem]">
            Пробное занятие LOTOS
          </h1>
          <p className="mt-2 max-w-lg text-[0.9375rem] leading-5 text-[var(--trial-secondary)] sm:text-base sm:leading-6">
            Подскажем условия и поможем подобрать группу для ребёнка.
          </p>
        </div>
      ) : (
        <div className="mb-7 max-w-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
            Лотос · онлайн-запись
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Выберите свой бассейн
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Удобный филиал, подходящая дата и тренер. Свободные места видны прямо в календаре.
          </p>
        </div>
      )}
      <div className={trial ? 'mb-4 flex gap-2.5' : 'mb-6 grid gap-3 sm:grid-cols-[1fr_240px]'}>
        <label
          className={
            trial
              ? 'flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[0.875rem] bg-[var(--trial-fill)] px-3 focus-within:ring-2 focus-within:ring-[var(--trial-tint)]'
              : 'flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 sm:gap-3 sm:px-4'
          }
        >
          <Search
            size={18}
            className={trial ? 'shrink-0 text-[var(--trial-secondary)]' : 'shrink-0 text-slate-400'}
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Поиск бассейна"
            placeholder={trial ? 'Поиск' : 'Бассейн, метро или адрес'}
            maxLength={150}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={
              trial
                ? 'min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--trial-secondary)]'
                : 'min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none'
            }
          />
        </label>
        {showCity && (
          <label
            className={
              trial
                ? 'relative flex w-[8.5rem] shrink-0 items-center rounded-[0.875rem] bg-white sm:w-52'
                : 'flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3'
            }
          >
            {!trial && <MapPin size={18} className="shrink-0 text-cyan-700" aria-hidden="true" />}
            <span className="sr-only">Город</span>
            <select
              aria-label="Город"
              value={town}
              onChange={(e) => setTown(e.target.value)}
              className={
                trial
                  ? 'min-h-11 w-full min-w-0 appearance-none rounded-[inherit] bg-transparent py-0 pr-7 pl-3 text-base text-[var(--trial-tint)]'
                  : 'min-h-12 min-w-0 flex-1 bg-transparent text-sm'
              }
            >
              <option value="">Все города</option>
              {data.cities.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {trial && (
              <ChevronDown
                className="pointer-events-none absolute right-2.5 text-[var(--trial-tint)]"
                size={16}
                aria-hidden="true"
              />
            )}
          </label>
        )}
      </div>
      {error && (
        <div role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p>{error}</p>
          <button
            className="min-h-11 font-semibold text-cyan-800 underline"
            onClick={() => setRetry((n) => n + 1)}
          >
            Повторить загрузку бассейнов
          </button>
        </div>
      )}
      {stale && !error ? (
        <div role="status" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={
                (trial ? 'h-28' : 'h-96') + ' animate-pulse rounded-[28px] border border-slate-100 bg-white'
              }
            />
          ))}
          <span className="sr-only">Ищем бассейны…</span>
        </div>
      ) : (
        !stale && (
          <>
            <p className={trial ? 'sr-only' : 'mb-4 text-xs text-slate-500'} role="status">
              Бассейнов на странице: {branches.length}
              {data.nextCursor ? ' · есть ещё' : ''}
            </p>
            {trial && branches.length > 0 && (
              <h2 className="mb-2.5 px-1 text-[0.9375rem] font-semibold tracking-tight">Выберите бассейн</h2>
            )}
            <div
              className={
                trial
                  ? 'grid items-start gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-3'
                  : 'grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3'
              }
            >
              {branches.map((b) =>
                trial ? (
                  <TrialPoolCard key={b.id} branch={b} open={() => setSelectedBranch(b)} />
                ) : (
                  <PoolCard
                    key={b.id}
                    branch={b}
                    remembered={b.id === recent}
                    generatedAt={data.generatedAt}
                    initialDate={date}
                    initialCategory={category}
                    context={{ q: search.trim(), city: town, source }}
                  />
                ),
              )}
            </div>
            {!branches.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="font-semibold">Бассейны не найдены</p>
                <p className="mt-2 text-sm text-slate-500">Попробуйте другое название, метро или город.</p>
              </div>
            )}
            {data.nextCursor && (
              <button
                type="button"
                disabled={moreBusy}
                onClick={() => void more()}
                className="mx-auto mt-6 flex min-h-12 items-center rounded-xl border border-cyan-200 bg-white px-6 font-semibold text-cyan-800 disabled:opacity-50"
              >
                {moreBusy ? 'Загружаем…' : 'Показать ещё бассейны'}
              </button>
            )}
          </>
        )
      )}
      {trial && selectedBranch && (
        <TrialPoolDialog
          branch={selectedBranch}
          consent={trialConsent}
          close={() => setSelectedBranch(null)}
        />
      )}
    </div>
  )
}
