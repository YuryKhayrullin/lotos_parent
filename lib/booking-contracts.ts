import { z } from 'zod'
z.config({ jitless: true })
const id = z.string().min(1).max(100)
export const bookingCatalogSchema = z.object({
  branches: z
    .array(
      z.object({
        id,
        name: z.string().min(1).max(150),
        address: z.string().min(1).max(300),
        city: z.string().min(1).max(100),
      }),
    )
    .max(500),
})
export type BookingBranch = z.infer<typeof bookingCatalogSchema>['branches'][number]
export const bookingLessonsSchema = z.object({
  bookingEnabled: z.boolean().default(false),
  payment: z.literal('on_site').optional(),
  lessons: z
    .array(
      z
        .object({
          id,
          title: z.string().max(150),
          category: z.enum(['swimming', 'synchronized_swimming']),
          localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startsAt: z.string().datetime({ offset: true }),
          endsAt: z.string().datetime({ offset: true }),
          timeZone: z.string().refine((value) => {
            try {
              new Intl.DateTimeFormat('ru', { timeZone: value })
              return true
            } catch {
              return false
            }
          }),
          location: z.string().nullable(),
          capacity: z.number().int().positive(),
          coachName: z.string(),
          available: z.number().int().nonnegative(),
        })
        .refine(
          (value) =>
            value.available <= value.capacity && Date.parse(value.endsAt) > Date.parse(value.startsAt),
        ),
    )
    .max(300),
})
export type BookingLesson = z.infer<typeof bookingLessonsSchema>['lessons'][number]
export const bookingCityUrl = (city: string) => '/select-city/branches?city=' + encodeURIComponent(city)
export const bookingBranchUrl = (id: string) => '/book/' + encodeURIComponent(id)
export function bookingMapUrl(branch: BookingBranch, embed = false) {
  const url = new URL(embed ? 'https://yandex.ru/map-widget/v1/' : 'https://yandex.ru/maps/')
  url.searchParams.set('mode', 'search')
  url.searchParams.set('text', [branch.city, branch.address].join(', '))
  return url.href
}
