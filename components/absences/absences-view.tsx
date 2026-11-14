'use client'

import { useEffect, useState } from 'react'
import { FileUp, HeartPulse, MessageCircle, RefreshCw } from 'lucide-react'
import { addDays, dateLabel, localDay, type ParentAttendance } from '@/lib/contracts'
import { requestJson } from '@/lib/api-client'
import { usePortal } from '@/components/portal/portal-provider'
import { PortalScreen } from '@/components/portal/portal-screen'
import { Card, EmptyState } from '@/components/ui/portal-ui'

export function AbsencesView() {
  const portal = usePortal()
  const [data, setData] = useState<ParentAttendance | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!portal.selectedChild) return
    const to = localDay(portal.selectedChild.timeZone)
    // Keep the request within the Parent attendance endpoint's bounded
    // 71-day window while still showing the recent absence history.
    const from = addDays(to, -70)
    const controller = new AbortController()
    setLoading(true)
    void requestJson<ParentAttendance>(
      `/api/parent/children/${encodeURIComponent(portal.selectedId)}/attendance?from=${from}&to=${to}`,
      { signal: controller.signal },
    )
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [portal.selectedChild, portal.selectedId])

  const absences =
    data?.days.flatMap((day) =>
      day.lessons.filter((lesson) => lesson.attendance === 'absent').map((lesson) => ({ day, lesson })),
    ) || []

  return (
    <PortalScreen>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-subtle)]">
                Пропуски
              </p>
              <h2 className="mt-2 text-2xl font-semibold">История пропусков</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Здесь будут отображаться пропущенные занятия и решения клуба по ним.
              </p>
            </div>
            {loading && <RefreshCw className="animate-spin text-[var(--color-subtle)]" size={18} />}
          </div>
          {absences.length ? (
            <div className="mt-5 divide-y divide-[var(--color-line)]">
              {absences.map(({ day, lesson }) => (
                <div key={lesson.id} className="flex flex-wrap items-center gap-3 py-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600">
                    <HeartPulse size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{lesson.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {dateLabel(day.date)} ·{' '}
                      {lesson.absenceReason === 'illness' ? 'Болезнь' : 'Причина не указана'}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {lesson.absenceResolution === 'excused'
                      ? 'Принята'
                      : lesson.absenceResolution === 'makeup'
                        ? 'Отработка'
                        : lesson.absenceResolution === 'pending'
                          ? 'На проверке'
                          : 'Без справки'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Пропусков пока нет"
              description="Если ребёнок пропустит занятие, оно появится здесь после отметки тренера."
            />
          )}
        </Card>
        <Card>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-subtle)]">
            Как это работает
          </p>
          <div className="mt-5 space-y-4 text-sm text-[var(--color-muted)]">
            <p>
              <b className="text-[var(--color-ink)]">Сообщите заранее.</b>
              <br />
              Тренер увидит информацию до начала занятия.
            </p>
            <p>
              <b className="text-[var(--color-ink)]">Загрузите справку.</b>
              <br />
              После добавления раздела загрузки документ будет доступен только клубу.
            </p>
            <p>
              <b className="text-[var(--color-ink)]">Дождитесь решения.</b>
              <br />
              Только принятая справка может сохранить занятие или оформить отработку.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-900 px-4 text-sm font-semibold text-white opacity-60"
            >
              <FileUp size={17} />
              Загрузить справку — скоро
            </button>
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-500"
            >
              <MessageCircle size={17} />
              Спросить тренера — скоро
            </button>
          </div>
        </Card>
      </div>
    </PortalScreen>
  )
}
