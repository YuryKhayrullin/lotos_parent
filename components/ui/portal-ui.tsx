'use client'

import { useEffect, useRef } from 'react'
import { CalendarDays, Clock3, MapPin, RefreshCw, UserRound, Waves, X } from 'lucide-react'
import type { Lesson } from '@/lib/contracts'
import { dateLabel, lessonLabel, timeLabel } from '@/lib/contracts'

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={'portal-card p-5 sm:p-6 ' + className}>{children}</div>
}

export function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={
        'text-[0.65rem] font-extrabold uppercase tracking-[0.2em] ' +
        (light ? 'text-[#a9c2d9]' : 'text-[var(--color-subtle)]')
      }
    >
      {children}
    </p>
  )
}

export function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string
  description?: string
  compact?: boolean
}) {
  return (
    <div className={compact ? 'py-4 text-center' : 'py-8 text-center'}>
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        <CalendarDays size={22} />
      </span>
      <p className="mt-4 font-extrabold">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted)]">{description}</p>
      )}
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Card className="border-[var(--color-danger)]/25">
      <div role="alert" className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-extrabold text-[var(--color-danger)]">Не удалось загрузить данные</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{message}</p>
        </div>
        <button
          type="button"
          onClick={retry}
          className="flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-navy)] px-5 text-sm font-bold text-white"
        >
          <RefreshCw size={16} />
          Повторить
        </button>
      </div>
    </Card>
  )
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Загружаем данные" className="space-y-5">
      <div className="h-52 animate-pulse rounded-[1.625rem] bg-[#dfe8f1]" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-[1.625rem] bg-white" />
        <div className="h-64 animate-pulse rounded-[1.625rem] bg-white" />
      </div>
    </div>
  )
}

export function StatusBadge({ lesson }: { lesson: Lesson }) {
  const colors =
    lesson.status === 'cancelled' || lesson.attendance === 'absent'
      ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
      : lesson.attendance === 'attended'
        ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
        : 'bg-[var(--color-surface-soft)] text-[var(--color-ink-soft)]'

  return (
    <span className={'inline-flex rounded-full px-3 py-1.5 text-[0.7rem] font-extrabold ' + colors}>
      {lessonLabel(lesson)}
    </span>
  )
}

export function LessonDialog({ lesson, close }: { lesson: Lesson; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    const previousOverflow = document.body.style.overflow
    element?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      element?.close()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      onCancel={close}
      onClose={close}
      onClick={(event) => {
        if (event.target !== dialog.current) return
        const rect = dialog.current.getBoundingClientRect()
        const outside =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        if (outside) close()
      }}
      className="portal-dialog portal-scrollbar fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border-0 bg-white p-0 text-[var(--color-ink)] shadow-[var(--shadow-float)] sm:rounded-[1.75rem]"
    >
      <div className="bg-gradient-to-br from-[var(--color-navy)] to-[#166f83] p-6 text-white sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
            <Waves size={24} />
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Закрыть карточку занятия"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12"
          >
            <X size={20} />
          </button>
        </div>
        <Eyebrow light>Тренировка</Eyebrow>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">{lesson.title}</h2>
      </div>
      <div className="p-6 sm:p-8">
        <div className="space-y-4 text-sm text-[var(--color-ink-soft)]">
          <p className="flex items-center gap-3">
            <CalendarDays size={18} className="text-[var(--color-accent)]" />
            {dateLabel(lesson.localDate, true)}
          </p>
          <p className="flex items-center gap-3">
            <Clock3 size={18} className="text-[var(--color-accent)]" />
            {timeLabel(lesson.startsAt, lesson.timeZone)} — {timeLabel(lesson.endsAt, lesson.timeZone)}
          </p>
          {lesson.location && (
            <p className="flex items-center gap-3">
              <MapPin size={18} className="text-[var(--color-accent)]" />
              {lesson.location}
            </p>
          )}
          {lesson.coachName && (
            <p className="flex items-center gap-3">
              <UserRound size={18} className="text-[var(--color-accent)]" />
              {lesson.coachName}
            </p>
          )}
        </div>
        <div className="mt-6">
          <StatusBadge lesson={lesson} />
        </div>
      </div>
    </dialog>
  )
}
