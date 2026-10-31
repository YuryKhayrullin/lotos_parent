'use client'
import { useEffect, useRef, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { PoolCard } from './pool-card'
import { bookingApi, type CatalogV2 } from '@/lib/booking-v2'
import { requestJson } from '@/lib/api-client'
export function PoolDirectory({
  initial,
  q = '',
  city = '',
  date = '',
  category = 'all',
  source,
}: {
  initial: CatalogV2
  q?: string
  city?: string
  date?: string
  category?: string
  source?: 'yandex_maps'
}) {
  const [search, setSearch] = useState(q),
    [town, setTown] = useState(city)
  const [data, setData] = useState(initial),
    [error, setError] = useState('')
  const [retry, setRetry] = useState(0),
    [moreBusy, setMoreBusy] = useState(false)
  const [recent, setRecent] = useState('')
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
  return (
    <div>
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
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_240px]">
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
          <Search size={20} className="shrink-0 text-slate-400" />
          <input
            type="search"
            aria-label="Поиск бассейна"
            placeholder="Бассейн, метро или адрес"
            maxLength={150}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
          <MapPin size={18} className="shrink-0 text-cyan-700" />
          <span className="sr-only">Город</span>
          <select
            aria-label="Город"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-sm"
          >
            <option value="">Все города</option>
            {data.cities.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
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
            <div key={n} className="h-96 animate-pulse rounded-[28px] border border-slate-100 bg-white" />
          ))}
          <span className="sr-only">Ищем бассейны…</span>
        </div>
      ) : (
        !stale && (
          <>
            <p className="mb-4 text-xs text-slate-500" role="status">
              Бассейнов на странице: {branches.length}
              {data.nextCursor ? ' · есть ещё' : ''}
            </p>
            <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
              {branches.map((b) => (
                <PoolCard
                  key={b.id}
                  branch={b}
                  remembered={b.id === recent}
                  generatedAt={data.generatedAt}
                  initialDate={date}
                  initialCategory={category}
                  context={{ q: search.trim(), city: town, source }}
                />
              ))}
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
    </div>
  )
}
