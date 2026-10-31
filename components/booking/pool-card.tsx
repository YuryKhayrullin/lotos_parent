'use client'
import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  TrainFront,
  UserRound,
  Waves,
} from 'lucide-react'
import { BookingCheckout } from './booking-checkout'
import { requestJson } from '@/lib/api-client'
import { timeLabel } from '@/lib/contracts'
import {
  addDays,
  bookingApi,
  bookingLink,
  dayInZone,
  monthBounds,
  moveMonth,
  priceLabel,
  ageLabel,
  rangeDays,
  weekStart,
  type AvailabilityBranch,
  type LessonPage,
  type PublicBranch,
  type PublicLesson,
} from '@/lib/booking-v2'
import { readAvailability } from '@/lib/booking-availability'
type Context = { q: string; city: string; source?: 'yandex_maps' }
const button =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 focus-visible:outline-2 focus-visible:outline-cyan-600 disabled:opacity-40'
const labelDate = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', ...options }).format(new Date(date + 'T12:00:00Z'))
export function PoolCard({
  branch,
  generatedAt,
  initialDate = '',
  initialCategory = 'all',
  initialLesson = '',
  detail = false,
  remembered = false,
  context = { q: '', city: '' },
}: {
  branch: PublicBranch
  generatedAt: string
  initialDate?: string
  initialCategory?: string
  initialLesson?: string
  detail?: boolean
  remembered?: boolean
  context?: Context
}) {
  const today = dayInZone(generatedAt, branch.timeZone)
  const [date, setDate] = useState(initialDate || today)
  const [anchor, setAnchor] = useState(initialDate || today)
  const [category, setCategory] = useState(initialCategory)
  const [month, setMonth] = useState(false)
  const [retry, setRetry] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)
  const [selected, setSelected] = useState<PublicLesson | null>(null)
  const [requestedLesson, setRequestedLesson] = useState(initialLesson)
  const interacted = useRef(Boolean(initialDate))
  const cardRef = useRef<HTMLElement | null>(null)
  const [nearViewport, setNearViewport] = useState(detail)
  const [calendar, setCalendar] = useState<{ key: string; data?: AvailabilityBranch; error?: string }>({
    key: '',
  })
  const [lessons, setLessons] = useState<{ key: string; data?: LessonPage; error?: string }>({ key: '' })
  const [moreBusy, setMoreBusy] = useState(false)
  const [moreError, setMoreError] = useState<{ key: string; message: string } | null>(null)
  const bounds = month ? monthBounds(anchor) : { from: weekStart(anchor), to: addDays(weekStart(anchor), 6) }
  const calendarKey = JSON.stringify([branch.id, bounds.from, bounds.to, category, retry])
  const calendarData = calendar.key === calendarKey ? calendar.data : undefined
  const calendarError = calendar.key === calendarKey ? calendar.error : undefined
  useEffect(() => {
    if (nearViewport) return
    const node = cardRef.current
    if (!node || !('IntersectionObserver' in window)) {
      setNearViewport(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '600px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [nearViewport])
  useEffect(() => {
    let alive = true
    void readAvailability(branch.id, bounds.from, bounds.to, category).then(
      (data) => {
        if (alive) setCalendar({ key: calendarKey, data })
      },
      (e) => {
        if (alive)
          setCalendar({
            key: calendarKey,
            error: e instanceof Error ? e.message : 'Не удалось загрузить календарь',
          })
      },
    )
    return () => {
      alive = false
    }
  }, [branch.id, bounds.from, bounds.to, category, calendarKey])
  useEffect(() => {
    if (interacted.current || !calendarData) return
    interacted.current = true
    if (calendarData.nextAvailableStartsAt) {
      const nearest = dayInZone(calendarData.nextAvailableStartsAt, branch.timeZone)
      setDate(nearest)
      setAnchor(nearest)
    }
  }, [calendarData, branch.timeZone])
  function lessonUrl(cursor?: string) {
    const params = new URLSearchParams({ from: date, to: date })
    if (category !== 'all') params.set('category', category)
    if (requestedLesson) params.set('lessonId', requestedLesson)
    if (cursor) params.set('cursor', cursor)
    return bookingApi + 'branches/' + encodeURIComponent(branch.id) + '/lessons?' + params
  }
  const initialNearestDate =
    !interacted.current && calendarData?.nextAvailableStartsAt
      ? dayInZone(calendarData.nextAvailableStartsAt, branch.timeZone)
      : ''
  const deferLessonLoad = Boolean(initialNearestDate && initialNearestDate !== date)
  const lessonKey = JSON.stringify([branch.id, date, category, requestedLesson, retry])
  const page = lessons.key === lessonKey ? lessons.data : undefined
  const lessonError = lessons.key === lessonKey ? lessons.error : undefined
  useEffect(() => {
    if (!nearViewport || !calendarData || deferLessonLoad) return
    const controller = new AbortController()
    const params = new URLSearchParams({ from: date, to: date })
    if (category !== 'all') params.set('category', category)
    if (requestedLesson) params.set('lessonId', requestedLesson)
    void requestJson<LessonPage>(
      bookingApi + 'branches/' + encodeURIComponent(branch.id) + '/lessons?' + params,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setLessons({ key: lessonKey, data })
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setLessons({
            key: lessonKey,
            error: e instanceof Error ? e.message : 'Не удалось загрузить занятия',
          })
      })
    return () => controller.abort()
  }, [branch.id, date, category, requestedLesson, lessonKey, nearViewport, calendarData, deferLessonLoad])
  useEffect(() => {
    if (!detail || !page || selected) return
    let candidate = page.lessons.find((l) => l.id === requestedLesson)
    if (!candidate)
      try {
        candidate = page.lessons.find((l) => sessionStorage.getItem('lotos-booking:' + l.id))
      } catch {}
    if (candidate) {
      let saved = false
      try {
        saved = Boolean(sessionStorage.getItem('lotos-booking:' + candidate.id))
      } catch {}
      if (candidate.available > 0 || saved) setSelected(candidate)
    }
  }, [page, detail, requestedLesson, selected])
  function remember() {
    try {
      localStorage.setItem('lotos-last-booking-branch', branch.id)
    } catch {}
  }
  function selectDay(next: string) {
    interacted.current = true
    setRequestedLesson('')
    setDate(next)
    if (detail)
      window.history.replaceState(null, '', bookingLink(branch.id, next, category, undefined, context))
  }
  function chooseCategory(next: string) {
    interacted.current = true
    setRequestedLesson('')
    setCategory(next)
    if (detail) window.history.replaceState(null, '', bookingLink(branch.id, date, next, undefined, context))
  }
  function updateUrl(lesson?: PublicLesson) {
    if (detail)
      window.history.replaceState(null, '', bookingLink(branch.id, date, category, lesson?.id, context))
  }
  async function more() {
    if (!page?.nextCursor || moreBusy) return
    const key = lessonKey
    setMoreBusy(true)
    setMoreError(null)
    try {
      const next = await requestJson<LessonPage>(lessonUrl(page.nextCursor))
      setLessons((old) =>
        old.key === key && old.data
          ? { key, data: { ...next, lessons: [...old.data.lessons, ...next.lessons] } }
          : old,
      )
    } catch (e) {
      setMoreError({
        key,
        message: e instanceof Error ? e.message : 'Не удалось загрузить следующие занятия',
      })
    } finally {
      setMoreBusy(false)
    }
  }
  const calendarDays = rangeDays(bounds.from, bounds.to)
  const stateByDay = new Map(calendarData?.days.map((d) => [d.date, d]))
  const leading = month ? (new Date(bounds.from + 'T12:00:00Z').getUTCDay() + 6) % 7 : 0
  const maps = new URL('https://yandex.ru/maps/')
  maps.searchParams.set('mode', 'search')
  maps.searchParams.set('text', branch.city + ', ' + branch.address)
  return (
    <article
      ref={cardRef}
      className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
      aria-label={'Бассейн ' + branch.name}
    >
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-950 via-cyan-800 to-teal-600 sm:h-44">
        {branch.photoUrl && !imageFailed ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={branch.photoUrl}
            alt={'Бассейн ' + branch.name}
            width={720}
            height={320}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <Waves className="size-16 text-white/60" aria-hidden="true" />
        )}
        <span className="absolute bottom-3 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-cyan-900">
          {branch.city}
        </span>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
        <header>
          {remembered && (
            <p className="mb-2 text-xs font-semibold text-violet-700">Вы выбирали этот бассейн</p>
          )}
          {detail && (
            <a
              href={(() => {
                const p = new URLSearchParams({ date })
                if (category !== 'all') p.set('category', category)
                if (context.q) p.set('q', context.q)
                if (context.city) p.set('city', context.city)
                if (context.source) p.set('source', context.source)
                return '/select-city?' + p
              })()}
              className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-cyan-700"
            >
              <ChevronLeft size={16} />
              Все бассейны на эту дату
            </a>
          )}
          <h2 className="break-words text-2xl font-bold tracking-tight text-slate-950">{branch.name}</h2>
          {branch.metro && (
            <p className="mt-2 flex items-start gap-2 text-sm font-medium text-violet-700">
              <TrainFront size={16} className="mt-0.5 shrink-0" />
              {branch.metro}
            </p>
          )}
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-600">
            <MapPin size={16} className="mt-1 shrink-0" />
            {branch.address}
          </p>
          <a
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-cyan-700 underline-offset-4 hover:underline"
            href={maps.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Как добраться ↗
          </a>
          {branch.arrivalText && (
            <details className="text-sm text-slate-600">
              <summary className="cursor-pointer py-2 font-medium">Как пройти к бассейну</summary>
              <p className="whitespace-pre-line leading-6">{branch.arrivalText}</p>
            </details>
          )}
        </header>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Направление">
          {[{ category: 'all', title: 'Все направления' }, ...branch.offers].map((offer) => (
            <button
              key={offer.category}
              type="button"
              disabled={!!selected}
              aria-pressed={category === offer.category}
              onClick={() => chooseCategory(offer.category)}
              className={
                button +
                ' ' +
                (category === offer.category ? '!border-cyan-600 !bg-cyan-50 !text-cyan-900' : '')
              }
            >
              {offer.title}
            </button>
          ))}
        </div>
        <section
          className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2 sm:p-3"
          aria-label="Календарь свободных мест"
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              className={button + ' !px-2'}
              aria-label={month ? 'Предыдущий месяц' : 'Предыдущая неделя'}
              disabled={!!selected}
              onClick={() => {
                interacted.current = true
                setAnchor(month ? moveMonth(anchor, -1) : addDays(anchor, -7))
                selectDay(month ? moveMonth(anchor, -1) : addDays(date, -7))
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-center text-sm font-bold capitalize">
              {month
                ? labelDate(bounds.from, { month: 'long', year: 'numeric' })
                : labelDate(bounds.from) + ' – ' + labelDate(bounds.to)}
            </p>
            <button
              type="button"
              className={button + ' !px-2'}
              aria-label={month ? 'Следующий месяц' : 'Следующая неделя'}
              disabled={!!selected}
              onClick={() => {
                interacted.current = true
                setAnchor(month ? moveMonth(anchor, 1) : addDays(anchor, 7))
                selectDay(month ? moveMonth(anchor, 1) : addDays(date, 7))
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div
            className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-500"
            aria-hidden="true"
          >
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: leading }, (_, i) => (
              <span key={'blank' + i} />
            ))}
            {calendarDays.map((d) => {
              const item = stateByDay.get(d),
                outside =
                  calendarData && (d < calendarData.bookableRange.from || d > calendarData.bookableRange.to)
              const disabled = !!selected || !calendarData || !!outside || !branch.bookingEnabled || d < today
              const description =
                d < today
                  ? 'прошедшая дата'
                  : item?.state === 'open'
                    ? 'есть свободные места'
                    : item?.state === 'full'
                      ? 'мест нет'
                      : outside
                        ? 'запись ещё не открыта'
                        : item?.state === 'closed'
                          ? 'запись закрыта'
                          : 'нет доступных занятий'
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  aria-pressed={date === d}
                  aria-label={
                    labelDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
                    ', ' +
                    description
                  }
                  onClick={() => selectDay(d)}
                  className={
                    'relative flex min-h-12 flex-col items-center justify-center rounded-xl text-base font-bold tabular-nums focus-visible:outline-2 focus-visible:outline-violet-600 disabled:opacity-35 ' +
                    (date === d ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white')
                  }
                >
                  {Number(d.slice(-2))}
                  <span
                    aria-hidden="true"
                    className={
                      'mt-1 size-1.5 rounded-full ' +
                      (item?.state === 'open'
                        ? date === d
                          ? 'bg-violet-200'
                          : 'bg-violet-600'
                        : item?.state === 'full'
                          ? 'border border-slate-400'
                          : 'bg-transparent')
                    }
                  />
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="size-1.5 rounded-full bg-violet-600" />
              Есть свободные места
            </span>
            <button
              type="button"
              disabled={!!selected}
              onClick={() => setMonth(!month)}
              className="min-h-11 px-2 text-sm font-semibold text-cyan-700 disabled:opacity-40"
            >
              {month ? 'Свернуть до недели' : 'Весь месяц'}
            </button>
          </div>
          {!calendarData && !calendarError && (
            <p role="status" className="py-2 text-xs text-slate-500">
              Загружаем свободные даты…
            </p>
          )}
          {calendarError && (
            <div role="alert" className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <p>{calendarError}</p>
              <button
                type="button"
                onClick={() => setRetry((n) => n + 1)}
                className="min-h-11 font-semibold underline"
              >
                Повторить загрузку календаря
              </button>
            </div>
          )}
          {calendarData && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Запись открыта до {labelDate(calendarData.bookableRange.to)}. Более поздние даты пока
              недоступны.
            </p>
          )}
        </section>
        {calendarData?.nextAvailableStartsAt && (
          <p className="flex items-start gap-2 text-sm text-cyan-800">
            <CalendarDays size={16} className="mt-0.5 shrink-0" />
            Ближайшее: {labelDate(dayInZone(calendarData.nextAvailableStartsAt, branch.timeZone))},{' '}
            {timeLabel(calendarData.nextAvailableStartsAt, branch.timeZone)}
          </p>
        )}
        {!branch.bookingEnabled ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Самостоятельная запись пока закрыта. Свяжитесь с клубом для выбора занятия.
          </p>
        ) : (
          <section aria-label={'Занятия на ' + date}>
            {requestedLesson && !selected && (
              <button
                type="button"
                className="mb-2 min-h-11 text-sm font-semibold text-cyan-700 underline"
                onClick={() => {
                  setRequestedLesson('')
                  updateUrl()
                }}
              >
                Все занятия этого дня
              </button>
            )}
            <h3 className="mb-3 text-base font-bold capitalize text-slate-900">
              {labelDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {lessonError ? (
              <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">
                <p>{lessonError}</p>
                <button
                  type="button"
                  onClick={() => setRetry((n) => n + 1)}
                  className="min-h-11 font-semibold text-cyan-700 underline"
                >
                  Повторить загрузку занятий
                </button>
              </div>
            ) : !page ? (
              <p role="status" className="py-4 text-sm text-slate-500">
                Загружаем занятия…
              </p>
            ) : (
              <div className="space-y-3">
                {page.lessons.map((lesson) => (
                  <div key={lesson.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-xl font-extrabold tabular-nums text-cyan-950">
                        {timeLabel(lesson.startsAt, lesson.timeZone)}
                        <span className="ml-1 text-sm font-medium text-slate-500">
                          – {timeLabel(lesson.endsAt, lesson.timeZone)}
                        </span>
                      </p>
                      <span
                        className={
                          'rounded-full px-2 py-1 text-xs font-semibold ' +
                          (lesson.available
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500')
                        }
                      >
                        {lesson.available ? 'Мест: ' + lesson.available : 'Мест нет'}
                      </span>
                    </div>
                    <p className="mt-2 break-words font-semibold">{lesson.title}</p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <UserRound size={14} />
                      {lesson.coachName}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 size={14} />
                      {Math.round((Date.parse(lesson.endsAt) - Date.parse(lesson.startsAt)) / 60000)} мин
                    </p>
                    <p className="mt-3 font-bold text-slate-900">
                      {priceLabel(lesson.publicOffer.trialPriceMinor)}
                    </p>
                    {(lesson.publicOffer.minAgeMonths !== null ||
                      lesson.publicOffer.maxAgeMonths !== null) && (
                      <p className="mt-1 text-xs text-slate-500">
                        Возраст:{' '}
                        {lesson.publicOffer.minAgeMonths === null
                          ? 'без нижней границы'
                          : 'от ' + ageLabel(lesson.publicOffer.minAgeMonths)}{' '}
                        {lesson.publicOffer.maxAgeMonths === null
                          ? ''
                          : 'до ' + ageLabel(lesson.publicOffer.maxAgeMonths) + ' включительно'}
                      </p>
                    )}
                    {lesson.publicOffer.conditions && (
                      <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                        {lesson.publicOffer.conditions}
                      </p>
                    )}
                    {selected?.id === lesson.id ? (
                      <BookingCheckout
                        lesson={selected}
                        branch={branch}
                        source={context.source}
                        onClose={() => {
                          setSelected(null)
                          setRequestedLesson('')
                          updateUrl()
                        }}
                      />
                    ) : detail ? (
                      <button
                        type="button"
                        disabled={!lesson.available || !!selected}
                        onClick={() => {
                          remember()
                          setSelected(lesson)
                          updateUrl(lesson)
                        }}
                        className="mt-3 min-h-12 w-full rounded-xl bg-cyan-700 px-3 text-sm font-semibold text-white disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        Записаться · оплата на месте
                      </button>
                    ) : lesson.available ? (
                      <a
                        href={bookingLink(branch.id, date, category, lesson.id, context)}
                        onClick={remember}
                        className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-cyan-700 px-3 text-center text-sm font-semibold text-white hover:bg-cyan-800"
                      >
                        Выбрать занятие
                      </a>
                    ) : null}
                  </div>
                ))}
                {!page.lessons.length && (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {requestedLesson ? (
                      <>
                        <p>Выбранное занятие больше недоступно для записи.</p>
                        <button
                          className="min-h-11 font-semibold text-cyan-700 underline"
                          onClick={() => {
                            setRequestedLesson('')
                            updateUrl()
                          }}
                        >
                          Выбрать другое занятие
                        </button>
                      </>
                    ) : date < page.bookableRange.from || date > page.bookableRange.to ? (
                      'На эту дату запись пока не открыта. Выберите дату в доступном периоде.'
                    ) : (
                      'На выбранную дату нет доступных занятий. Посмотрите другие даты или направления.'
                    )}
                  </div>
                )}
                {page.nextCursor && (
                  <button
                    type="button"
                    disabled={moreBusy || !!selected}
                    onClick={() => void more()}
                    className={button + ' w-full'}
                  >
                    {moreBusy ? 'Загружаем…' : 'Показать ещё занятия'}
                  </button>
                )}
                {moreError?.key === lessonKey && (
                  <p role="alert" className="text-sm text-rose-700">
                    {moreError.message}
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </article>
  )
}
