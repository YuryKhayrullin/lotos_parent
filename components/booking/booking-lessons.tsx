'use client'
import { useEffect, useState } from 'react'
import { BookingCheckout } from './booking-checkout'
import { CalendarDays, Clock3, MapPin, UserRound, UsersRound } from 'lucide-react'
import { dateLabel, timeLabel } from '@/lib/contracts'
import type { BookingLesson } from '@/lib/booking-contracts'

export function BookingLessons({
  lessons,
  individual,
  bookingEnabled = false,
}: {
  lessons: BookingLesson[]
  individual: boolean
  bookingEnabled?: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => {
    try {
      const saved = lessons.find((l) => sessionStorage.getItem('lotos-booking:' + l.id))
      if (saved) setSelected(saved.id)
    } catch {}
  }, [lessons])
  const [category, setCategory] = useState('all')
  const [day, setDay] = useState('all')
  // Current CRM lessons have no individual-service classification. A group with
  // capacity 1 must not be advertised as a personal session merely by inference.
  const suitable = individual ? [] : lessons
  const days = [...new Set(suitable.map((lesson) => lesson.localDate))]
  const filtered = suitable.filter(
    (lesson) =>
      (category === 'all' || lesson.category === category) && (day === 'all' || lesson.localDate === day),
  )
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">
        {individual ? 'Индивидуальные занятия' : 'Групповые занятия'}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Расписание на ближайшие четыре недели. Количество мест может измениться.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-500">
          Направление
          <select
            disabled={!!selected}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Все направления</option>
            <option value="swimming">Плавание</option>
            <option value="synchronized_swimming">Синхронное плавание</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Дата
          <select
            disabled={!!selected}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Все даты</option>
            {days.map((value) => (
              <option key={value} value={value}>
                {dateLabel(value, true)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-5 space-y-3">
        {filtered.map((lesson) => (
          <article key={lesson.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-cyan-800">
                <CalendarDays size={17} />
                {dateLabel(lesson.localDate, true)}
              </p>
              <span
                className={
                  'rounded-full px-3 py-1 text-xs font-semibold ' +
                  (lesson.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')
                }
              >
                {selected === lesson.id
                  ? 'Выбранное занятие'
                  : lesson.available
                    ? 'Мест: ' + lesson.available
                    : 'Мест нет'}
              </span>
            </div>
            <div className="mt-4 flex items-start gap-4">
              <div className="min-w-20 rounded-2xl bg-cyan-50 p-3 text-center">
                <p className="text-xl font-bold tabular text-cyan-900">
                  {timeLabel(lesson.startsAt, lesson.timeZone)}
                </p>
                <p className="mt-1 text-xs text-cyan-700">до {timeLabel(lesson.endsAt, lesson.timeZone)}</p>
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-base font-bold">{lesson.title}</h2>
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <UserRound size={14} />
                  {lesson.coachName}
                </p>
                {lesson.location && (
                  <p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
                    <MapPin size={14} className="shrink-0" />
                    {lesson.location}
                  </p>
                )}
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 size={14} />
                  {Math.round((Date.parse(lesson.endsAt) - Date.parse(lesson.startsAt)) / 60000)} мин
                  <UsersRound size={14} />
                  до {lesson.capacity}
                </p>
              </div>
            </div>
            {bookingEnabled &&
              (selected === lesson.id ? (
                <BookingCheckout lesson={lesson} onClose={() => setSelected(null)} />
              ) : (
                <button
                  type="button"
                  disabled={!lesson.available || !!selected}
                  onClick={() => setSelected(lesson.id)}
                  className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-700 px-4 text-sm font-semibold text-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {lesson.available ? 'Записаться · оплата на месте' : 'Мест нет'}
                </button>
              ))}
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center">
          <CalendarDays className="mx-auto mb-3 text-cyan-600" />
          <p className="font-semibold">Пока нет подходящих занятий</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Выберите другую дату или направление. Новые занятия появятся после утверждения расписания клубом.
          </p>
        </div>
      )}
      {!bookingEnabled && (
        <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Самостоятельная запись пока закрыта. Расписание доступно для просмотра.
        </p>
      )}
    </>
  )
}
