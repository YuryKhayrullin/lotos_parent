'use client'

import { useState } from 'react'
import { Check, ChevronRight, Clock3, X } from 'lucide-react'
import type { Lesson } from '@/lib/contracts'
import { dateLabel, timeLabel } from '@/lib/contracts'
import { usePortal } from '@/components/portal/portal-provider'
import { PortalScreen } from '@/components/portal/portal-screen'
import { AttendanceSummary } from '@/components/portal/summary-cards'
import { Card, EmptyState, LessonDialog, StatusBadge } from '@/components/ui/portal-ui'

export function AttendanceView() {
  const portal = usePortal()
  const overview = portal.overview
  const [lesson, setLesson] = useState<Lesson | null>(null)

  return (
    <PortalScreen>
      {overview && (
        <div className="space-y-5">
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
                  <p className="text-3xl font-black tabular">{overview.attendance.attended}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Был на занятии</p>
                </div>
              </Card>
              <Card className="flex min-h-32 flex-col justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
                  <X size={19} />
                </span>
                <div>
                  <p className="text-3xl font-black tabular">{overview.attendance.absent}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Не был</p>
                </div>
              </Card>
              <Card className="col-span-2 flex min-h-32 flex-col justify-between sm:col-span-1">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface-soft)] text-[var(--color-ink-soft)]">
                  <Clock3 size={19} />
                </span>
                <div>
                  <p className="text-3xl font-black tabular">{overview.attendance.unmarked}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Ожидает отметки</p>
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-[var(--color-subtle)]">
                  Журнал
                </p>
                <h2 className="mt-2 text-xl font-black">История занятий</h2>
              </div>
              <p className="text-xs font-bold text-[var(--color-muted)]">{overview.history.length} записей</p>
            </div>
            {overview.history.length ? (
              <div className="mt-4 divide-y divide-[var(--color-line)]">
                {overview.history.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setLesson(item)}
                    className="flex min-h-20 w-full items-center justify-between gap-3 py-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">{item.title}</p>
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
      {lesson && <LessonDialog lesson={lesson} close={() => setLesson(null)} />}
    </PortalScreen>
  )
}
