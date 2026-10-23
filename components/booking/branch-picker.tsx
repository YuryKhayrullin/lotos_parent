'use client'
import { useState } from 'react'
import { ChevronRight, ExternalLink, List, Map, MapPin, Search } from 'lucide-react'
import { bookingBranchUrl, bookingMapUrl, type BookingBranch } from '@/lib/booking-contracts'

export function BranchPicker({ branches, city }: { branches: BookingBranch[]; city: string }) {
  const [view, setView] = useState<'list' | 'map'>('list')
  const [query, setQuery] = useState('')
  const [mapAllowed, setMapAllowed] = useState(false)
  const [focusedId, setFocusedId] = useState(branches[0]?.id || '')
  const filtered = branches.filter((branch) =>
    (branch.name + ' ' + branch.address)
      .toLocaleLowerCase('ru')
      .includes(query.trim().toLocaleLowerCase('ru')),
  )
  const focused = filtered.find((branch) => branch.id === focusedId) || filtered[0]
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Выберите филиал</h1>
      <a
        href="/select-city"
        className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4"
      >
        <MapPin size={19} className="text-cyan-700" />
        <span className="flex-1 font-semibold text-slate-800">{city || 'Все города'}</span>
        <span className="text-xs font-medium text-cyan-700">Изменить</span>
      </a>
      <div
        className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1"
        role="group"
        aria-label="Вид филиалов"
      >
        {(
          [
            { id: 'list', label: 'Список', Icon: List },
            { id: 'map', label: 'На карте', Icon: Map },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={
              'flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ' +
              (view === id ? 'bg-white text-cyan-800 shadow-sm' : 'text-slate-500 hover:text-slate-800')
            }
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 px-4">
        <Search size={19} className="shrink-0 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название или адрес"
          aria-label="Поиск филиала"
          className="min-h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <p className="my-4 text-xs text-slate-400" role="status">
        Филиалов: {filtered.length}
      </p>
      {view === 'map' && focused && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200">
          <label className="block border-b border-slate-100 p-3 text-xs text-slate-500">
            Филиал на карте
            <select
              aria-label="Филиал на карте"
              value={focused.id}
              onChange={(event) => setFocusedId(event.target.value)}
              className="mt-1 block min-h-10 w-full min-w-0 bg-white text-sm font-semibold text-slate-800"
            >
              {filtered.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          {mapAllowed ? (
            <iframe
              sandbox="allow-scripts allow-same-origin allow-popups"
              key={focused.id}
              src={bookingMapUrl(focused, true)}
              title={'Карта: ' + focused.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-80 w-full border-0 sm:h-96"
            />
          ) : (
            <div className="p-5 text-sm leading-6 text-slate-600">
              <p>
                Карту предоставляет Яндекс. При загрузке браузер передаст ему технические данные соединения.
                Можно продолжить выбор по списку.
              </p>
              <button
                type="button"
                onClick={() => setMapAllowed(true)}
                className="mt-4 min-h-11 rounded-xl bg-cyan-700 px-4 font-semibold text-white"
              >
                Загрузить Яндекс-карту
              </button>
            </div>
          )}
          <a
            href={bookingMapUrl(focused)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 border-t border-slate-100 p-3 text-xs text-cyan-700"
          >
            Открыть в Яндекс Картах
            <ExternalLink size={15} />
          </a>
        </div>
      )}
      <div className="space-y-3">
        {filtered.map((branch) => (
          <a
            key={branch.id}
            href={bookingBranchUrl(branch.id)}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition-colors hover:border-cyan-300 hover:bg-cyan-50/40 sm:p-5"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <MapPin size={23} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                {branch.name}
              </span>
              <span className="mt-1 block break-words text-sm leading-5 text-slate-500">
                {branch.address}
              </span>
            </span>
            <ChevronRight className="shrink-0 text-slate-300 group-hover:text-cyan-700" size={20} />
          </a>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-7 text-center">
          <MapPin className="mx-auto mb-3 text-cyan-600" />
          <p className="font-semibold">Филиалы не найдены</p>
          <p className="mt-2 text-sm text-slate-500">Попробуйте другой адрес или выберите другой город.</p>
        </div>
      )}
    </>
  )
}
