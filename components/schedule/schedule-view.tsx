'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Clock3, MapPin, UserRound } from 'lucide-react'
import type { Lesson, ScheduleRange } from '@/lib/contracts'
import { addDays, dateLabel, localDay, mondayOf, timeLabel } from '@/lib/contracts'
import { requestJson } from '@/lib/api-client'
import { usePortal } from '@/components/portal/portal-provider'
import { PortalScreen } from '@/components/portal/portal-screen'
import { WeekStrip } from '@/components/portal/summary-cards'
import { Card, EmptyState, Eyebrow, LessonDialog, StatusBadge } from '@/components/ui/portal-ui'

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function monthTitle(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(value + '-01T12:00:00Z'),
  )
}
function moveMonth(value: string, offset: number) {
  const date = new Date(value + '-01T12:00:00Z')
  date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toISOString().slice(0, 7)
}
function LessonCards({ lessons, select }: { lessons: Lesson[]; select: (lesson: Lesson) => void }) {
  if (!lessons.length)
    return (
      <Card>
        <EmptyState title="В этот день занятий нет" description="Выберите другой день в календаре." />
      </Card>
    )
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {lessons.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => select(item)}
          className="portal-card w-full p-5 text-left transition-transform hover:-translate-y-0.5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <StatusBadge lesson={item} />
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
            </div>
            <ChevronRight size={19} className="text-[var(--color-accent)]" />
          </div>
          <div className="mt-5 space-y-3 text-sm text-[var(--color-muted)]">
            <p className="flex items-center gap-3">
              <Clock3 size={17} />
              {timeLabel(item.startsAt, item.timeZone)} — {timeLabel(item.endsAt, item.timeZone)}
            </p>
            {item.location && (
              <p className="flex items-center gap-3">
                <MapPin size={17} />
                {item.location}
              </p>
            )}
            {item.coachName && (
              <p className="flex items-center gap-3">
                <UserRound size={17} />
                {item.coachName}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

export function ScheduleView() {
  const portal = usePortal()
  const overview = portal.overview
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [lesson, setLesson] = useState<{ childId: string; value: Lesson } | null>(null)
  const [monthData, setMonthData] = useState<ScheduleRange | null>(null)
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthError, setMonthError] = useState('')

  const today = overview ? localDay(overview.child.timeZone) : ''
  const requestedDay = searchParams.get('day') || ''
  const view = searchParams.get('view') === 'month' ? 'month' : 'week'
  const requestedMonth = searchParams.get('month') || ''
  const month = /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : (requestedDay || today).slice(0, 7)
  const monthStart = month ? mondayOf(month + '-01') : ''
  const monthEnd = monthStart ? addDays(monthStart, 41) : ''
  const monthSelected =
    requestedDay >= month + '-01' && requestedDay.slice(0, 7) === month ? requestedDay : month + '-01'

  useEffect(() => {
    if (view !== 'month' || !portal.selectedId || !monthStart || !monthEnd) return
    const controller = new AbortController()
    setMonthData(null)
    setMonthLoading(true)
    setMonthError('')
    void requestJson<ScheduleRange>(
      '/api/parent/children/' +
        encodeURIComponent(portal.selectedId) +
        '/schedule?from=' +
        encodeURIComponent(monthStart) +
        '&to=' +
        encodeURIComponent(monthEnd),
      { signal: controller.signal },
    )
      .then((value) => {
        if (!controller.signal.aborted) setMonthData(value)
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setMonthError(reason instanceof Error ? reason.message : 'Не удалось загрузить календарь.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setMonthLoading(false)
      })
    return () => controller.abort()
  }, [monthEnd, monthStart, portal.selectedId, view])

  const monthLessons = useMemo(
    () => (monthData?.schedule || []).filter((item) => item.localDate === monthSelected),
    [monthData, monthSelected],
  )

  if (!overview)
    return (
      <PortalScreen>
        <span />
      </PortalScreen>
    )

  const selected =
    requestedDay >= overview.weekStart && requestedDay <= overview.weekEnd
      ? requestedDay
      : today >= overview.weekStart && today <= overview.weekEnd
        ? today
        : overview.weekStart
  const lessons = overview.schedule.filter((item) => item.localDate === selected)

  const replace = (change: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    change(params)
    router.replace(pathname + '?' + params.toString(), { scroll: false })
  }
  const chooseWeekDay = (day: string) =>
    replace((params) => {
      params.set('day', day)
    })
  const chooseMonthDay = (day: string) =>
    replace((params) => {
      params.set('day', day)
      params.set('month', day.slice(0, 7))
    })
  const setView = (next: 'week' | 'month') =>
    replace((params) => {
      if (next === 'month') {
        params.set('view', 'month')
        params.set('month', (requestedDay || today).slice(0, 7))
      } else {
        params.delete('view')
        params.delete('month')
        const day = requestedDay || today
        params.set('week', mondayOf(day))
        params.set('day', day)
      }
    })
  const goMonth = (offset: number) => {
    const next = moveMonth(month, offset)
    replace((params) => {
      params.set('month', next)
      params.set('day', next + '-01')
    })
  }
  const visibleLessons = view === 'month' ? monthLessons : lessons
  const visibleDay = view === 'month' ? monthSelected : selected

  return (
    <PortalScreen>
      <div className="space-y-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow>Календарь ребёнка</Eyebrow>
            <div className="flex rounded-xl bg-[var(--color-surface-soft)] p-1" aria-label="Режим календаря">
              {(['week', 'month'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={view === item}
                  onClick={() => setView(item)}
                  className={
                    'min-h-9 rounded-lg px-4 text-sm font-semibold transition-colors ' +
                    (view === item ? 'bg-white text-cyan-800 shadow-sm' : 'text-[var(--color-muted)]')
                  }
                >
                  {item === 'week' ? 'Неделя' : 'Месяц'}
                </button>
              ))}
            </div>
          </div>

          {view === 'week' ? (
            <>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.035em]">Неделя занятий</h2>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {dateLabel(overview.weekStart)} — {dateLabel(overview.weekEnd)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Предыдущая неделя"
                    disabled={addDays(overview.weekStart, -7) < addDays(today, -366)}
                    onClick={() => portal.selectWeek(addDays(overview.weekStart, -7))}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-soft)] disabled:opacity-40"
                  >
                    <ChevronLeft size={19} />
                  </button>
                  <button
                    type="button"
                    aria-label="Следующая неделя"
                    disabled={addDays(overview.weekStart, 7) > addDays(today, 366)}
                    onClick={() => portal.selectWeek(addDays(overview.weekStart, 7))}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-soft)] disabled:opacity-40"
                  >
                    <ChevronRight size={19} />
                  </button>
                </div>
              </div>
              <WeekStrip overview={overview} selected={selected} choose={chooseWeekDay} />
            </>
          ) : (
            <>
              <div className="mt-3 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold capitalize tracking-[-0.035em]">{monthTitle(month)}</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Предыдущий месяц"
                    disabled={month <= addDays(today, -366).slice(0, 7)}
                    onClick={() => goMonth(-1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-soft)] disabled:opacity-40"
                  >
                    <ChevronLeft size={19} />
                  </button>
                  <button
                    type="button"
                    aria-label="Следующий месяц"
                    disabled={month >= addDays(today, 366).slice(0, 7)}
                    onClick={() => goMonth(1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-soft)] disabled:opacity-40"
                  >
                    <ChevronRight size={19} />
                  </button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold text-[var(--color-muted)] sm:gap-2">
                {weekdays.map((day) => (
                  <span key={day} className="py-1">
                    {day}
                  </span>
                ))}
                {Array.from({ length: 42 }, (_, index) => addDays(monthStart, index)).map((day) => {
                  const inMonth = day.slice(0, 7) === month
                  const active = day === monthSelected
                  const count = monthData?.schedule.filter((item) => item.localDate === day).length || 0
                  return (
                    <button
                      type="button"
                      key={day}
                      aria-label={dateLabel(day, true) + (count ? ', занятий: ' + count : '')}
                      aria-pressed={active}
                      onClick={() => chooseMonthDay(day)}
                      className={
                        'relative flex min-h-12 flex-col items-center justify-center rounded-xl text-sm transition-colors sm:min-h-16 ' +
                        (active
                          ? 'bg-[var(--color-accent)] font-bold text-white shadow-sm'
                          : inMonth
                            ? 'text-slate-800 hover:bg-[var(--color-surface-soft)]'
                            : 'text-slate-300')
                      }
                    >
                      {Number(day.slice(8))}
                      {count > 0 && (
                        <span
                          className={'mt-1 h-1.5 w-1.5 rounded-full ' + (active ? 'bg-white' : 'bg-cyan-600')}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
              {monthLoading && (
                <p role="status" className="mt-4 text-sm text-[var(--color-muted)]">
                  Загружаем месяц…
                </p>
              )}
              {monthError && (
                <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {monthError}
                </p>
              )}
            </>
          )}
        </Card>

        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <Eyebrow>Выбранный день</Eyebrow>
            <h2 className="mt-1 text-xl font-semibold capitalize">{dateLabel(visibleDay, true)}</h2>
          </div>
          <p className="text-xs font-bold text-[var(--color-muted)]">
            {visibleLessons.length} {visibleLessons.length === 1 ? 'занятие' : 'занятия'}
          </p>
        </div>

        <LessonCards
          lessons={visibleLessons}
          select={(value) => setLesson({ childId: portal.selectedId, value })}
        />
      </div>
      {lesson && lesson.childId === portal.selectedId && (
        <LessonDialog lesson={lesson.value} close={() => setLesson(null)} />
      )}
    </PortalScreen>
  )
}
