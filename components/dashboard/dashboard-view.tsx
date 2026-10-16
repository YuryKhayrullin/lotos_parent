'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronRight, Clock3, MapPin, ReceiptText, Waves } from 'lucide-react'
import type { Lesson } from '@/lib/contracts'
import { dateLabel, localDay, money, paymentDate, timeLabel } from '@/lib/contracts'
import { usePortal } from '@/components/portal/portal-provider'
import { PortalScreen } from '@/components/portal/portal-screen'
import { AttendanceSummary, SubscriptionSummary, WeekStrip } from '@/components/portal/summary-cards'
import { Card, EmptyState, Eyebrow, LessonDialog } from '@/components/ui/portal-ui'

export function DashboardView() {
  const portal = usePortal()
  const router = useRouter()
  const overview = portal.overview
  const [lesson, setLesson] = useState<Lesson | null>(null)

  return (
    <PortalScreen>
      {overview && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
            {overview.nextLesson ? (
              <button
                type="button"
                onClick={() => setLesson(overview.nextLesson)}
                className="relative min-h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-[#103c4a] via-[#0c5265] to-[#078b9e] p-6 text-left text-white shadow-[0_12px_32px_rgb(15_23_42/10%)] sm:p-8"
              >
                <span className="absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-white/5" />
                <span className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Waves size={25} />
                </span>
                <Eyebrow light>Ближайшая тренировка</Eyebrow>
                <h2 className="mt-4 max-w-[80%] text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  {overview.nextLesson.title}
                </h2>
                <div className="mt-8 flex flex-col gap-3 text-sm font-bold sm:flex-row sm:flex-wrap sm:items-center">
                  <span className="flex items-center gap-2">
                    <CalendarDays size={17} />
                    {dateLabel(overview.nextLesson.localDate)}
                  </span>
                  <span className="flex items-center gap-2 text-cyan-50/80">
                    <Clock3 size={17} />
                    {timeLabel(overview.nextLesson.startsAt, overview.nextLesson.timeZone)} —{' '}
                    {timeLabel(overview.nextLesson.endsAt, overview.nextLesson.timeZone)}
                  </span>
                  {overview.nextLesson.location && (
                    <span className="flex items-center gap-2 text-cyan-50/80">
                      <MapPin size={17} />
                      {overview.nextLesson.location}
                    </span>
                  )}
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold">
                  Подробнее
                  <ChevronRight size={16} />
                </span>
              </button>
            ) : (
              <div className="min-h-56 rounded-3xl bg-gradient-to-br from-[#103c4a] via-[#0c5265] to-[#078b9e] p-6 text-white sm:p-8">
                <Eyebrow light>Ближайшая тренировка</Eyebrow>
                <h2 className="mt-4 text-2xl font-semibold">Пока не назначена</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-cyan-50/80">
                  Занятие появится здесь, когда клуб обновит расписание ребёнка.
                </p>
              </div>
            )}

            <Link
              href={portal.hrefFor('/attendance')}
              className="portal-card block p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
            >
              <AttendanceSummary overview={overview} />
              <span className="mt-5 flex items-center justify-between text-xs font-semibold text-[var(--color-accent)]">
                История посещений
                <ChevronRight size={16} />
              </span>
            </Link>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Eyebrow>Расписание</Eyebrow>
                  <h2 className="mt-2 text-xl font-semibold">Эта неделя</h2>
                </div>
                <Link
                  href={portal.hrefFor('/schedule')}
                  className="text-xs font-semibold text-[var(--color-accent)]"
                >
                  Весь календарь
                </Link>
              </div>
              <WeekStrip
                overview={overview}
                selected={localDay(overview.child.timeZone)}
                choose={(day) => {
                  router.push(portal.hrefFor('/schedule', { day }))
                }}
              />
              <div className="mt-4 space-y-2">
                {overview.schedule.length ? (
                  overview.schedule.slice(0, 3).map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setLesson(item)}
                      className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-[var(--color-canvas)] p-4 text-left"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-[var(--color-subtle)]">
                          {dateLabel(item.localDate)} · {timeLabel(item.startsAt, item.timeZone)}
                        </p>
                      </div>
                      <ChevronRight size={17} className="text-[var(--color-muted)]" />
                    </button>
                  ))
                ) : (
                  <EmptyState
                    compact
                    title="На этой неделе занятий нет"
                    description="Проверьте следующую неделю или уточните расписание в клубе."
                  />
                )}
              </div>
            </Card>

            <Link
              href={portal.hrefFor('/subscription')}
              className="portal-card block p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
            >
              <Eyebrow>Последняя оплата</Eyebrow>
              <h2 className="mt-2 text-xl font-semibold">Оплаты и абонемент</h2>
              {overview.payments.items[0] ? (
                <div className="mt-6 rounded-2xl bg-cyan-50 p-5">
                  <ReceiptText className="text-cyan-700" size={23} />
                  <p className="mt-4 text-2xl font-semibold tabular">
                    {money(overview.payments.items[0].amountMinor)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {paymentDate(overview.payments.items[0].paidAt, overview.child.timeZone)}
                  </p>
                  <p className="mt-3 text-sm font-semibold">
                    Начислено: {overview.payments.items[0].lessonsAdded} занятий
                  </p>
                </div>
              ) : (
                <EmptyState
                  compact
                  title="Оплат пока нет"
                  description="Дата оплаты и начисленные занятия появятся после записи администратором."
                />
              )}
              <span className="mt-5 flex items-center justify-between text-xs font-semibold text-[var(--color-accent)]">
                История оплат
                <ChevronRight size={16} />
              </span>
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Link href={portal.hrefFor('/subscription')} className="portal-card block p-5 sm:p-6">
              <SubscriptionSummary overview={overview} />
            </Link>
            <Card>
              <Eyebrow>Ваш клуб</Eyebrow>
              <h2 className="mt-2 text-xl font-semibold">{overview.child.branchName}</h2>
              <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                План: {overview.child.lessonsPerWeek}{' '}
                {overview.child.lessonsPerWeek === 1 ? 'занятие' : 'занятия'} в неделю.
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                Расписание, остаток и отметки посещения обновляет клуб.
              </p>
            </Card>
          </div>
        </div>
      )}
      {lesson && <LessonDialog lesson={lesson} close={() => setLesson(null)} />}
    </PortalScreen>
  )
}
