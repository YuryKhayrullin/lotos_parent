export type Child = {
  id: string
  name: string
  birthDate: string | null
  branchName: string
  timeZone: string
  category: string
  lessonsPerWeek: number
  status: 'active' | 'paused' | 'archived'
}
export type Lesson = {
  id: string
  title: string
  localDate: string
  startsAt: string
  endsAt: string
  timeZone: string
  location: string | null
  coachName: string | null
  status: 'scheduled' | 'completed' | 'cancelled'
  attendance: 'attended' | 'absent' | null
}
export type Payment = {
  id: string
  paidAt: string
  amountMinor: string
  lessonsAdded: number
  packageLessons: number
}
export type PaymentPage = { items: Payment[]; nextCursor: string | null }
export type Overview = {
  child: Child
  remainingLessons: number
  weekStart: string
  weekEnd: string
  nextLesson: Lesson | null
  schedule: Lesson[]
  attendance: {
    attended: number
    absent: number
    unmarked: number
    percent: number | null
    from: string
    to: string
  }
  history: Lesson[]
  historyHasMore: boolean
  payments: PaymentPage
  updatedAt: string
}
export type ChildrenResponse = { parentName: string; children: Child[] }

export function localDay(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: string) => parts.find((part) => part.type === type)?.value
  return value('year') + '-' + value('month') + '-' + value('day')
}
export function addDays(day: string, count: number) {
  const date = new Date(day + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}
export function mondayOf(day: string) {
  return addDays(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7))
}
export function dateLabel(day: string, weekday = false) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(weekday ? { weekday: 'long' as const } : {}),
    timeZone: 'UTC',
  }).format(new Date(day + 'T12:00:00Z'))
}
export function timeLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  )
}
export function paymentDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}
export function money(minor: string) {
  const amount = BigInt(minor),
    absolute = amount < 0n ? -amount : amount
  const fraction = absolute % 100n
  return (
    (amount < 0n ? '−' : '') +
    new Intl.NumberFormat('ru-RU').format(absolute / 100n) +
    (fraction ? ',' + fraction.toString().padStart(2, '0') : '') +
    ' ₽'
  )
}
export function ageYears(birthDate: string | null, today: string) {
  if (!birthDate) return null
  const birth = birthDate.slice(0, 10)
  return Number(today.slice(0, 4)) - Number(birth.slice(0, 4)) - (today.slice(5) < birth.slice(5) ? 1 : 0)
}
export function lessonLabel(lesson: Lesson) {
  if (lesson.status === 'cancelled') return 'Отменено'
  if (lesson.attendance === 'attended') return 'Был'
  if (lesson.attendance === 'absent') return 'Не был'
  if (lesson.status === 'completed') return 'Проведено · без отметки'
  return 'По расписанию'
}

export function categoryLabel(value: string) {
  return value === 'synchronized_swimming' ? 'Синхронное плавание' : value === 'swimming' ? 'Плавание' : value
}
