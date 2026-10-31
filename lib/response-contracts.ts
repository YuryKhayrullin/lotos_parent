import { catalogV2Schema, availabilityV2Schema, lessonsV2Schema } from './booking-v2'
import { z } from 'zod'
import type { Child, Lesson, Overview, PaymentPage } from './contracts'
import { bookingCatalogSchema, bookingLessonsSchema } from './booking-contracts'

// Zod's object JIT uses dynamic evaluation. The parent app intentionally denies
// unsafe-eval, including when validation could otherwise fall back after a CSP violation.
z.config({ jitless: true })

const id = z.string().min(1).max(100)
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + 'T12:00:00Z')
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  })
const instant = z.string().datetime({ offset: true })
const zone = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('ru-RU', { timeZone: value })
      return true
    } catch {
      return false
    }
  })
export const childResponse: z.ZodType<Child> = z.object({
  id,
  name: z.string(),
  birthDate: day.nullable(),
  branchName: z.string(),
  timeZone: zone,
  category: z.string(),
  lessonsPerWeek: z.number().int().nonnegative(),
  status: z.enum(['active', 'paused', 'archived']),
})
const lessonResponse: z.ZodType<Lesson> = z
  .object({
    id,
    title: z.string(),
    localDate: day,
    startsAt: instant,
    endsAt: instant,
    timeZone: zone,
    location: z.string().nullable(),
    coachName: z.string().nullable(),
    status: z.enum(['scheduled', 'completed', 'cancelled']),
    attendance: z.enum(['attended', 'absent']).nullable(),
  })
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt))
export const paymentsResponse: z.ZodType<PaymentPage> = z.object({
  items: z
    .array(
      z.object({
        id,
        paidAt: instant,
        amountMinor: z.string().regex(/^-?\d{1,30}$/),
        lessonsAdded: z.number().int(),
        packageLessons: z.number().int().nonnegative(),
      }),
    )
    .max(20),
  nextCursor: z.string().max(1000).nullable(),
})
export const overviewResponse: z.ZodType<Overview> = z.object({
  child: childResponse,
  remainingLessons: z.number().int().nonnegative(),
  weekStart: day,
  weekEnd: day,
  nextLesson: lessonResponse.nullable(),
  schedule: z.array(lessonResponse).max(10000),
  attendance: z.object({
    attended: z.number().int().nonnegative(),
    absent: z.number().int().nonnegative(),
    unmarked: z.number().int().nonnegative(),
    percent: z.number().min(0).max(100).nullable(),
    from: day,
    to: day,
  }),
  history: z.array(lessonResponse).max(100),
  historyHasMore: z.boolean(),
  payments: paymentsResponse,
  updatedAt: instant,
})
const identityResponse = z.object({ user: z.object({ id, name: z.string() }) })
export function parseApiResponse(path: string, value: unknown): unknown {
  const pathname = new URL(path, 'http://parent.internal').pathname
  if (
    ['/api/parent/booking/hold', '/api/parent/booking/status', '/api/parent/booking/resend-code'].includes(
      pathname,
    )
  )
    return z
      .object({
        token: z.string().max(150),
        expiresAt: instant,
        state: z.enum(['held', 'confirmed', 'cancelled', 'expired']),
        requiresCode: z.boolean(),
        emailStatus: z.string().max(30),
        emailAttempts: z.number().int().min(0).max(5),
        canResendAt: instant.nullable(),
        payment: z.literal('on_site'),
      })
      .parse(value)
  if (['/api/parent/booking/confirm', '/api/parent/booking/cancel'].includes(pathname))
    return z.object({ success: z.literal(true), state: z.literal('confirmed').optional() }).parse(value)
  if (pathname === '/api/parent/booking/v2/catalog') return catalogV2Schema.parse(value)
  if (pathname === '/api/parent/booking/v2/availability') return availabilityV2Schema.parse(value)
  if (/^\/api\/parent\/booking\/v2\/branches\/[^/]+\/lessons$/.test(pathname))
    return lessonsV2Schema.parse(value)
  if (pathname === '/api/parent/booking/catalog') return bookingCatalogSchema.parse(value)
  if (/^\/api\/parent\/booking\/branches\/[^/]+\/lessons$/.test(pathname))
    return bookingLessonsSchema.parse(value)
  if (['/api/auth/get-session', '/api/auth/sign-in/email'].includes(pathname))
    return identityResponse.parse(value)
  if (['/api/auth/invitation-status', '/api/auth/recovery-status'].includes(pathname))
    return z
      .object({
        state: z.enum(['valid', 'invalid', 'expired', 'revoked', 'activated', 'used']),
        sharedAccount: z.boolean().optional(),
      })
      .parse(value)
  if (pathname === '/api/auth/reset-password') return z.object({ success: z.literal(true) }).parse(value)
  if (pathname === '/api/auth/request-password-reset')
    return z.object({ accepted: z.literal(true) }).parse(value)
  if (pathname === '/api/auth/activate')
    return z.object({ success: z.literal(true), signedIn: z.boolean().optional() }).parse(value)
  if (pathname === '/api/auth/sign-out') return z.object({ success: z.literal(true) }).parse(value)
  if (pathname === '/api/parent/children')
    return z.object({ parentName: z.string(), children: z.array(childResponse).max(1000) }).parse(value)
  const match = pathname.match(/^\/api\/parent\/children\/([^/]+)\/(overview|payments|schedule)$/)
  if (match?.[2] === 'overview') {
    const data = overviewResponse.parse(value)
    if (data.child.id !== decodeURIComponent(match[1])) throw Error('Unexpected child identity')
    return data
  }
  if (match?.[2] === 'payments') return paymentsResponse.parse(value)
  if (match?.[2] === 'schedule')
    return z.object({ from: day, to: day, schedule: z.array(lessonResponse).max(10000) }).parse(value)
  return z.record(z.string(), z.unknown()).parse(value)
}
