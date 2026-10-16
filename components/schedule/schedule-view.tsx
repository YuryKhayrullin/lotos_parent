'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Clock3, MapPin, UserRound } from 'lucide-react'
import type { Lesson } from '@/lib/contracts'
import { addDays, dateLabel, localDay, timeLabel } from '@/lib/contracts'
import { usePortal } from '@/components/portal/portal-provider'
import { PortalScreen } from '@/components/portal/portal-screen'
import { WeekStrip } from '@/components/portal/summary-cards'
import { Card, EmptyState, Eyebrow, LessonDialog, StatusBadge } from '@/components/ui/portal-ui'

export function ScheduleView() {
  const portal = usePortal()
  const overview = portal.overview
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [lesson, setLesson] = useState<Lesson | null>(null)

  if (!overview)
    return (
      <PortalScreen>
        <span />
      </PortalScreen>
    )

  const today = localDay(overview.child.timeZone)
  const requestedDay = searchParams.get('day') || ''
  const selected =
    requestedDay >= overview.weekStart && requestedDay <= overview.weekEnd
      ? requestedDay
      : today >= overview.weekStart && today <= overview.weekEnd
        ? today
        : overview.weekStart
  const lessons = overview.schedule.filter((item) => item.localDate === selected)

  const chooseDay = (day: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('day', day)
    router.replace(pathname + '?' + params.toString(), { scroll: false })
  }

  return (
    <PortalScreen>
      <div className="space-y-5">
        <Card>
          <Eyebrow>Календарь ребёнка</Eyebrow>
          <div className="mt-2 flex items-center justify-between gap-3">
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
          <WeekStrip overview={overview} selected={selected} choose={chooseDay} />
        </Card>

        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <Eyebrow>Выбранный день</Eyebrow>
            <h2 className="mt-1 text-xl font-semibold capitalize">{dateLabel(selected, true)}</h2>
          </div>
          <p className="text-xs font-bold text-[var(--color-muted)]">
            {lessons.length} {lessons.length === 1 ? 'занятие' : 'занятия'}
          </p>
        </div>

        {lessons.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {lessons.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setLesson(item)}
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
        ) : (
          <Card>
            <EmptyState
              title="В этот день занятий нет"
              description="Выберите другой день или перейдите на следующую неделю."
            />
          </Card>
        )}
      </div>
      {lesson && <LessonDialog lesson={lesson} close={() => setLesson(null)} />}
    </PortalScreen>
  )
}
