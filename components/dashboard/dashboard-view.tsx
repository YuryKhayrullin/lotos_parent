'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  UserRound,
  ClipboardCheck,
  CreditCard,
} from 'lucide-react'
import type { Lesson } from '@/lib/contracts'
import { categoryLabel, dateLabel, timeLabel } from '@/lib/contracts'
import { usePortal } from '@/components/portal/portal-provider'
import { PortalScreen } from '@/components/portal/portal-screen'
import { AttendanceSummary, SubscriptionSummary } from '@/components/portal/summary-cards'
import { Card, Eyebrow, LessonDialog } from '@/components/ui/portal-ui'
export function DashboardView() {
  const portal = usePortal()
  const overview = portal.overview
  const [lesson, setLesson] = useState<{ childId: string; value: Lesson } | null>(null)
  const next = overview?.nextLesson
  return (
    <PortalScreen>
      {overview && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-3xl bg-gradient-to-br from-[#103c4a] to-[#078b9e] p-5 text-white sm:p-6">
              <Eyebrow light>Ближайшая утверждённая тренировка</Eyebrow>
              {next ? (
                <button
                  type="button"
                  className="mt-4 w-full text-left"
                  onClick={() => setLesson({ childId: portal.selectedId, value: next })}
                >
                  <h2 className="text-2xl font-bold tracking-tight">{next.title}</h2>
                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <span className="flex items-center gap-2">
                      <CalendarDays size={17} />
                      {dateLabel(next.localDate)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock3 size={17} />
                      {timeLabel(next.startsAt, next.timeZone)} — {timeLabel(next.endsAt, next.timeZone)}
                    </span>
                    <span className="flex items-center gap-2">
                      <UserRound size={17} />
                      {next.coachName || 'Тренер уточняется'}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin size={17} />
                      {next.location || overview.child.branchName}
                    </span>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold">
                    Открыть занятие
                    <ChevronRight size={16} />
                  </span>
                </button>
              ) : (
                <div className="mt-4">
                  <h2 className="text-2xl font-semibold">Пока не назначена</h2>
                  <p className="mt-3 text-sm leading-6 text-cyan-50/90">
                    Клуб ещё не опубликовал будущее занятие ребёнка. Уточните расписание у администратора.
                  </p>
                </div>
              )}
            </section>
            <Card>
              <SubscriptionSummary overview={overview} />
              {overview.remainingLessons === 0 && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  Занятия закончились. Обратитесь в клуб для продления абонемента.
                </p>
              )}
            </Card>
          </div>
          <nav aria-label="Действия с карточкой ребёнка" className="grid gap-3 sm:grid-cols-3">
            {[
              { path: '/schedule', label: 'Открыть расписание', icon: CalendarDays },
              { path: '/subscription', label: 'Посмотреть абонемент', icon: CreditCard },
              { path: '/attendance', label: 'История посещений', icon: ClipboardCheck },
            ].map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                href={portal.hrefFor(path)}
                className="portal-card flex min-h-16 items-center gap-3 p-4 text-sm font-semibold text-cyan-800"
              >
                <Icon size={21} />
                <span className="flex-1">{label}</span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </nav>
          <Card>
            <AttendanceSummary overview={overview} />
          </Card>
          <p className="px-1 text-xs text-slate-500">
            {overview.child.branchName} · {categoryLabel(overview.child.category)}. В кабинете показывается
            опубликованное расписание; черновики тренера появятся после согласования.
          </p>
        </div>
      )}
      {lesson && overview && lesson.childId === portal.selectedId && (
        <LessonDialog key={portal.selectedId} lesson={lesson.value} close={() => setLesson(null)} />
      )}
    </PortalScreen>
  )
}
