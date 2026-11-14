'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react'
import type { Lesson, ParentAttendance } from '@/lib/contracts'
import { addDays, dateLabel, localDay, timeLabel } from '@/lib/contracts'
import { usePortal } from '@/components/portal/portal-provider'
import { PortalScreen } from '@/components/portal/portal-screen'
import { AttendanceSummary } from '@/components/portal/summary-cards'
import { Card, EmptyState, LessonDialog, StatusBadge } from '@/components/ui/portal-ui'
import { requestJson } from '@/lib/api-client'

function AttendanceHeatmap({
  data,
  today,
  month,
  previousMonth,
  nextMonth,
}: {
  data: ParentAttendance
  today: string
  month: string
  previousMonth: () => void
  nextMonth: () => void
}) {
  const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const monthStart = month + '-01'
  const monthEnd = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10)
  const monthCount = Number(monthEnd.slice(8, 10))
  const leading = (new Date(monthStart + 'T12:00:00Z').getUTCDay() + 6) % 7
  const monthDays = Array.from({ length: leading + monthCount }, (_, index) => {
    if (index < leading) return null
    const date = addDays(monthStart, index - leading)
    return data.days.find((day) => day.date === date) || { date, status: 'empty' as const, lessons: [] }
  })
  const marked = monthDays.filter((day): day is NonNullable<typeof day> => Boolean(day))
  const attended = marked.filter((day) => day.status === 'attended').length
  const excused = marked.filter((day) => day.status === 'excused').length
  const absent = marked.filter((day) => day.status === 'absent').length
  const statusTone = (status: ParentAttendance['days'][number]['status'] | undefined) =>
    status === 'attended'
      ? 'bg-emerald-500 text-white'
      : status === 'excused'
        ? 'bg-violet-300 text-white'
        : status === 'absent'
          ? 'bg-fuchsia-500 text-white'
          : status === 'upcoming'
            ? 'border border-dashed border-slate-400 bg-white text-slate-500'
            : status === 'unmarked'
              ? 'bg-slate-300 text-white'
              : 'bg-slate-100 text-slate-400'
  const monthLabel = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(today + 'T12:00:00Z'))
  return (
    <Card className="mr-auto w-full max-w-md">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={previousMonth}
              aria-label="Предыдущий месяц"
              className="flex size-7 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-subtle)]">
              Посещаемость · {monthLabel}
            </p>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Следующий месяц"
              className="flex size-7 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <p className="mt-2 text-4xl font-semibold tabular">
            {attended + excused + absent
              ? Math.round(((attended + excused) / (attended + excused + absent)) * 100) + '%'
              : '—'}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {attended + excused} из {attended + excused + absent} отмеченных занятий
          </p>
        </div>
        {month === today.slice(0, 7) && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            Сегодня, {today.slice(8)}
          </span>
        )}
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[0.62rem] font-semibold text-[var(--color-subtle)]">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {monthDays.map((day, index) => {
          const isToday = day?.date === today
          return (
            <div
              key={index}
              className={`relative flex h-10 items-center justify-center rounded-xl text-xs ${day ? statusTone(day.status) : ''} ${isToday ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' : ''}`}
              title={isToday ? 'Сегодня, ' + dateLabel(today) : day ? dateLabel(day.date) : undefined}
            >
              {day && (
                <>
                  <span className="absolute top-1.5 text-[0.65rem] font-semibold">{day.date.slice(8)}</span>
                  {day.lessons.length > 0 && (
                    <span
                      className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${isToday ? 'bg-white' : day.status === 'upcoming' ? 'bg-slate-500' : 'bg-white'}`}
                    />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-muted)]">
        <span>
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-emerald-500" />
          Был(а)
        </span>
        <span>
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-violet-300" />
          По справке
        </span>
        <span>
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-fuchsia-500" />
          Пропуск
        </span>
        <span>
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded border border-dashed border-slate-400" />
          Впереди
        </span>
      </div>
    </Card>
  )
}

export function AttendanceView() {
  const portal = usePortal()
  const overview = portal.overview
  const [lesson, setLesson] = useState<{ childId: string; value: Lesson } | null>(null)
  const [attendance, setAttendance] = useState<ParentAttendance | null>(null)
  const [month, setMonth] = useState('')
  useEffect(() => {
    if (!portal.selectedChild) return
    const to = localDay(portal.selectedChild.timeZone)
    const initialMonth = to.slice(0, 7)
    if (!month) setMonth(initialMonth)
    const activeMonth = month || initialMonth
    const year = Number(activeMonth.slice(0, 4)),
      monthIndex = Number(activeMonth.slice(5, 7))
    const from = activeMonth + '-01'
    const rangeTo = new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10)
    const controller = new AbortController()
    void requestJson<ParentAttendance>(
      `/api/parent/children/${encodeURIComponent(portal.selectedId)}/attendance?from=${from}&to=${rangeTo}`,
      { signal: controller.signal },
    )
      .then(setAttendance)
      .catch(() => undefined)
    return () => controller.abort()
  }, [month, portal.selectedChild, portal.selectedId])

  const shiftMonth = (offset: number) => {
    const base = month ? new Date(month + '-15T12:00:00Z') : new Date()
    base.setUTCMonth(base.getUTCMonth() + offset)
    setMonth(base.toISOString().slice(0, 7))
  }

  return (
    <PortalScreen>
      {overview && (
        <div className="space-y-5">
          {attendance && (
            <AttendanceHeatmap
              data={attendance}
              today={portal.selectedChild ? localDay(portal.selectedChild.timeZone) : ''}
              month={month || attendance.from.slice(0, 7)}
              previousMonth={() => shiftMonth(-1)}
              nextMonth={() => shiftMonth(1)}
            />
          )}
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <AttendanceSummary overview={overview} />
              <p className="mt-5 text-xs leading-5 text-[var(--color-subtle)]">
                Период: {dateLabel(overview.attendance.from)} — {dateLabel(overview.attendance.to)}. Будущие и
                неотмеченные занятия в процент не входят.
              </p>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Card className="flex min-h-32 flex-col justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-success-soft)] text-[var(--color-success)]">
                  <Check size={19} />
                </span>
                <div>
                  <p className="text-3xl font-semibold tabular">{overview.attendance.attended}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Был на занятии</p>
                </div>
              </Card>
              <Card className="flex min-h-32 flex-col justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
                  <X size={19} />
                </span>
                <div>
                  <p className="text-3xl font-semibold tabular">{overview.attendance.absent}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Не был</p>
                </div>
              </Card>
              <Card className="col-span-2 flex min-h-32 flex-col justify-between sm:col-span-1">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface-soft)] text-[var(--color-ink-soft)]">
                  <Clock3 size={19} />
                </span>
                <div>
                  <p className="text-3xl font-semibold tabular">{overview.attendance.unmarked}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Ожидает отметки</p>
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-subtle)]">
                  Журнал
                </p>
                <h2 className="mt-2 text-xl font-semibold">История занятий</h2>
              </div>
              <p className="text-xs font-bold text-[var(--color-muted)]">{overview.history.length} записей</p>
            </div>
            {overview.history.length ? (
              <div className="mt-4 divide-y divide-[var(--color-line)]">
                {overview.history.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setLesson({ childId: portal.selectedId, value: item })}
                    className="flex min-h-20 w-full items-center justify-between gap-3 py-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {dateLabel(item.localDate)} · {timeLabel(item.startsAt, item.timeZone)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge lesson={item} />
                      <ChevronRight size={17} className="text-[var(--color-subtle)]" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Отметок пока нет"
                description="После проведённого занятия здесь появится отметка тренера."
              />
            )}
            {overview.historyHasMore && (
              <p className="mt-4 rounded-2xl bg-[var(--color-surface-soft)] p-3 text-xs text-[var(--color-muted)]">
                Показаны последние 100 занятий за выбранный период.
              </p>
            )}
          </Card>
        </div>
      )}
      {lesson && overview && lesson.childId === portal.selectedId && (
        <LessonDialog lesson={lesson.value} close={() => setLesson(null)} />
      )}
    </PortalScreen>
  )
}
