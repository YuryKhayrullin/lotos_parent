'use client'
import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { TrialPoolCard, TrialPoolDialog } from './trial-pool-card'
import { normalizeTrialSearch, type TrialLocation } from '@/lib/trial-locations'
import type { TrialRequestConsent } from '@/lib/trial-request'

export function TrialDirectory({
  locations,
  q,
  city,
  consent,
}: {
  locations: TrialLocation[]
  q: string
  city: string
  consent: TrialRequestConsent | null
}) {
  const cities = [...new Set(locations.map((location) => location.city))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  )
  const [search, setSearch] = useState(q)
  const [town, setTown] = useState(cities.includes(city) ? city : '')
  const [selected, setSelected] = useState<TrialLocation | null>(null)
  const words = normalizeTrialSearch(search).split(' ').filter(Boolean)
  const matches = locations.filter(
    (location) =>
      (!town || location.city === town) && words.every((word) => location.searchText.includes(word)),
  )

  function updateFilters(query: string, selectedCity: string) {
    setSearch(query)
    setTown(selectedCity)
    const url = new URL(window.location.href)
    for (const [key, value] of Object.entries({ q: query.trim(), city: selectedCity })) {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    window.history.replaceState(null, '', url)
  }

  return (
    <div>
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
      <div className="mb-4 flex gap-2.5">
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[0.875rem] bg-[var(--trial-fill)] px-3 focus-within:ring-2 focus-within:ring-[var(--trial-tint)]">
          <Search size={18} className="shrink-0 text-[var(--trial-secondary)]" aria-hidden="true" />
          <input
            type="search"
            aria-label="Поиск бассейна"
            placeholder="Поиск"
            maxLength={150}
            value={search}
            onChange={(event) => updateFilters(event.target.value, town)}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--trial-secondary)]"
          />
        </label>
        <label className="relative flex w-[8.5rem] shrink-0 items-center rounded-[0.875rem] bg-white sm:w-52">
          <select
            aria-label="Город"
            value={town}
            onChange={(event) => updateFilters(search, event.target.value)}
            className="min-h-11 w-full min-w-0 appearance-none rounded-[inherit] bg-transparent py-0 pr-7 pl-3 text-base text-[var(--trial-tint)]"
          >
            <option value="">Все города</option>
            {cities.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-2.5 text-[var(--trial-tint)]"
            aria-hidden="true"
          />
        </label>
      </div>
      <p className="sr-only" role="status">
        Бассейнов на странице: {matches.length}
      </p>
      {matches.length ? (
        <>
          <h2 className="mb-2.5 px-1 text-[0.9375rem] font-semibold tracking-tight">Выберите бассейн</h2>
          <div className="grid items-start gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((location) => (
              <TrialPoolCard key={location.id} branch={location} open={() => setSelected(location)} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--trial-border)] bg-white p-8 text-center">
          <p className="font-semibold">Бассейны не найдены</p>
          <p className="mt-2 text-sm text-[var(--trial-secondary)]">
            Попробуйте другое название, метро или город.
          </p>
        </div>
      )}
      {selected && <TrialPoolDialog branch={selected} consent={consent} close={() => setSelected(null)} />}
    </div>
  )
}
