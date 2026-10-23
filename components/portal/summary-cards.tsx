'use client'

import { addDays, dateLabel, categoryLabel } from '@/lib/contracts'
import type { Overview } from '@/lib/contracts'
import { Eyebrow } from '@/components/ui/portal-ui'

export function AttendanceSummary({ overview }: { overview: Overview }) {
  const stats = overview.attendance
  return (
    <div>
      <Eyebrow>Посещаемость · 30 дней</Eyebrow>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-4xl font-semibold tracking-[-0.05em] tabular">
          {stats.percent === null ? '—' : stats.percent + '%'}
        </p>
        {stats.percent !== null && (
          <p className="pb-1 text-xs font-bold text-[var(--color-success)]">
            {stats.attended} из {stats.attended + stats.absent}
          </p>
        )}
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e9eef4]">
        <div
          className="h-full rounded-full bg-[var(--color-success)] transition-[width]"
          style={{ width: (stats.percent ?? 0) + '%' }}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--color-muted)]">
        {stats.percent === null
          ? 'Пока нет отмеченных занятий'
          : 'Был: ' + stats.attended + ' · Не был: ' + stats.absent}
      </p>
      {stats.unmarked > 0 && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">Ожидают отметки: {stats.unmarked}</p>
      )}
    </div>
  )
}

export function SubscriptionSummary({ overview }: { overview: Overview }) {
  const category = categoryLabel(overview.child.category)
  return (
    <div>
      <Eyebrow>Абонемент</Eyebrow>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">{category}</h2>
      <div className="mt-5 flex items-center gap-4">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[5px] border-cyan-100 border-t-[var(--color-accent)] text-2xl font-semibold tabular">
          {overview.remainingLessons}
        </span>
        <div>
          <p className="text-sm font-semibold">Осталось занятий</p>
          <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
            Остаток обновляется после отметки тренера.
          </p>
        </div>
      </div>
    </div>
  )
}

export function WeekStrip({
  overview,
  selected,
  choose,
}: {
  overview: Overview
  selected: string
  choose: (day: string) => void
}) {
  return (
    <div className="mt-5 grid grid-cols-7 gap-1 sm:gap-2">
      {Array.from({ length: 7 }, (_, index) => addDays(overview.weekStart, index)).map((day) => {
        const marked = overview.schedule.some((lesson) => lesson.localDate === day)
        const active = selected === day
        return (
          <button
            type="button"
            key={day}
            onClick={() => choose(day)}
            aria-label={dateLabel(day, true)}
            aria-pressed={active}
            className={
              'flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl transition-colors ' +
              (active
                ? 'bg-[var(--color-accent)] text-white shadow-md shadow-cyan-700/10'
                : 'text-[var(--color-subtle)] hover:bg-[var(--color-surface-soft)]')
            }
          >
            <span className="text-[0.62rem] font-semibold">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][(new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7]}
            </span>
            <b className="text-lg">{day.slice(8)}</b>
            <span
              className={
                'h-1.5 w-1.5 rounded-full ' +
                (marked
                  ? active
                    ? 'bg-white'
                    : 'bg-[var(--color-accent)]'
                  : active
                    ? 'bg-white/35'
                    : 'bg-[#d4dfea]')
              }
            />
          </button>
        )
      })}
    </div>
  )
}
