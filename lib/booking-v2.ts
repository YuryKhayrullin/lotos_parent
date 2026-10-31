import { z } from 'zod'
import { bookingLessonsSchema } from './booking-contracts'
z.config({ jitless: true })
const id = z.string().min(1).max(100)
export const bookingDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const date = new Date(s + 'T12:00:00Z')
    return Number.isFinite(+date) && date.toISOString().slice(0, 10) === s
  })
export const bookingCategorySchema = z.enum(['swimming', 'synchronized_swimming'])
export type BookingCategory = z.infer<typeof bookingCategorySchema>
const zone = z
  .string()
  .max(100)
  .refine((s) => {
    try {
      new Intl.DateTimeFormat('ru', { timeZone: s })
      return true
    } catch {
      return false
    }
  })
const range = z.object({ from: bookingDaySchema, to: bookingDaySchema }).refine((x) => x.from <= x.to)
export const publicOfferSchema = z
  .object({
    category: bookingCategorySchema,
    title: z.string().min(1).max(150),
    published: z.literal(true),
    trialPriceMinor: z
      .string()
      .regex(/^(0|[1-9]\d{0,9})$/)
      .nullable(),
    currency: z.literal('RUB'),
    minAgeMonths: z.number().int().min(0).max(2160).nullable(),
    maxAgeMonths: z.number().int().min(0).max(2160).nullable(),
    conditions: z.string().max(1000),
  })
  .refine((x) => x.minAgeMonths === null || x.maxAgeMonths === null || x.minAgeMonths <= x.maxAgeMonths)
export const publicBranchSchema = z.object({
  id,
  name: z.string().min(1).max(150),
  address: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  timeZone: zone,
  metro: z.string().max(150).nullable(),
  photoUrl: z
    .string()
    .max(1500)
    .url()
    .refine((s) => /^https?:\/\//.test(s))
    .nullable(),
  arrivalText: z.string().max(1000).nullable(),
  bookingEnabled: z.boolean(),
  offers: z.array(publicOfferSchema).max(2),
})
export const catalogV2Schema = z.object({
  schemaVersion: z.literal(2),
  generatedAt: z.string().datetime(),
  cities: z.array(z.string().max(100)).max(500),
  branches: z.array(publicBranchSchema).max(24),
  nextCursor: z.string().max(1000).nullable(),
})
const bookable = range.safeExtend({ until: z.string().datetime() })
export const availabilityV2Schema = z.object({
  schemaVersion: z.literal(2),
  generatedAt: z.string().datetime(),
  requestedRange: range,
  branches: z
    .array(
      z
        .object({
          branchId: id,
          timeZone: zone,
          bookingEnabled: z.boolean(),
          coveredRange: range.nullable(),
          bookableRange: bookable,
          nextAvailableStartsAt: z.string().datetime().nullable(),
          days: z
            .array(
              z
                .object({
                  date: bookingDaySchema,
                  state: z.enum(['open', 'full', 'empty', 'closed']),
                  availableLessonCount: z.number().int().nonnegative(),
                  nearestAvailableStartsAt: z.string().datetime().nullable(),
                })
                .refine((x) =>
                  x.state === 'open'
                    ? x.availableLessonCount > 0 && x.nearestAvailableStartsAt !== null
                    : x.availableLessonCount === 0,
                ),
            )
            .max(31),
        })
        .refine((x) =>
          x.days.every(
            (d) => x.coveredRange !== null && d.date >= x.coveredRange.from && d.date <= x.coveredRange.to,
          ),
        ),
    )
    .max(12),
})
const oldLesson = bookingLessonsSchema.shape.lessons.element
export const lessonV2Schema = oldLesson.safeExtend({ branchId: id, publicOffer: publicOfferSchema })
export const lessonsV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    generatedAt: z.string().datetime(),
    branchId: id,
    coveredRange: range.nullable(),
    bookableRange: bookable,
    bookingEnabled: z.boolean(),
    lessons: z.array(lessonV2Schema).max(100),
    nextCursor: z.string().max(1000).nullable(),
  })
  .refine((x) => x.lessons.every((l) => l.branchId === x.branchId))
export type PublicBranch = z.infer<typeof publicBranchSchema>
export type CatalogV2 = z.infer<typeof catalogV2Schema>
export type AvailabilityBranch = z.infer<typeof availabilityV2Schema>['branches'][number]
export type PublicLesson = z.infer<typeof lessonV2Schema>
export type LessonPage = z.infer<typeof lessonsV2Schema>
export const bookingApi = '/api/parent/booking/v2/'
export function dayInZone(instant: string, zone: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant))
}
export function addDays(day: string, n: number) {
  return new Date(+new Date(day + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10)
}
export function weekStart(day: string) {
  return addDays(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7))
}
export function monthBounds(day: string) {
  const from = day.slice(0, 7) + '-01',
    d = new Date(from + 'T12:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + 1)
  return { from, to: addDays(d.toISOString().slice(0, 10), -1) }
}
export function moveMonth(day: string, offset: number) {
  const d = new Date(day.slice(0, 7) + '-01T12:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + offset)
  return d.toISOString().slice(0, 10)
}
export function rangeDays(from: string, to: string) {
  const days: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  return days
}
export function priceLabel(value: string | null) {
  if (value === null) return 'Стоимость уточните в клубе'
  if (value === '0') return 'Бесплатно'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(Number(value) / 100)
}
export function bookingLink(
  branchId: string,
  date: string,
  category: string,
  lessonId?: string,
  context: { q: string; city: string; source?: 'yandex_maps' } = { q: '', city: '' },
) {
  const params = new URLSearchParams({ date })
  if (category !== 'all') params.set('category', category)
  if (lessonId) params.set('lesson', lessonId)
  if (context.q) params.set('q', context.q)
  if (context.city) params.set('city', context.city)
  if (context.source) params.set('source', context.source)
  return '/book/' + encodeURIComponent(branchId) + '?' + params
}

export function ageLabel(months: number) {
  const years = Math.floor(months / 12),
    rest = months % 12
  const label = new Intl.PluralRules('ru-RU').select(years)
  const text = years + ' ' + (label === 'one' ? 'год' : label === 'few' ? 'года' : 'лет')
  return years ? text + (rest ? ' ' + rest + ' мес.' : '') : months + ' мес.'
}
