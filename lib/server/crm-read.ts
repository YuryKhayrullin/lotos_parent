import type { PoolClient } from 'pg'
import { z } from 'zod'
import type { Child, Lesson, Overview, PaymentPage, Payment } from '../contracts'
import { addDays, localDay, mondayOf } from '../contracts'
import type { Databases } from './database'
import { ApiError } from './errors'
import { requireChild } from './access'

const idSchema = z.string().min(1).max(100)
export const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((day) => {
    const date = new Date(day + 'T12:00:00Z')
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day
  }, 'Invalid date')
const cursorSchema = z.object({ date: z.string().datetime(), id: idSchema }).strict()

export async function withCrmRead<T>(runtime: Databases, work: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await runtime.crmPool.connect()
  try {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    await db.query("SET LOCAL statement_timeout = '8s'")
    const {
      rows: [role],
    } = await db.query(`
      SELECT current_user AS name,
        (SELECT rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb FROM pg_roles WHERE rolname=current_user) AS elevated,
        has_schema_privilege(current_user,'public','CREATE') AS can_create,
        EXISTS (SELECT 1 FROM unnest(ARRAY['clients','branches','coaches','lessons','lesson_enrollments','attendance','payments']) AS t(name)
          WHERE has_table_privilege(current_user,'public.'||t.name,'INSERT,UPDATE,DELETE,TRUNCATE')) AS can_write
    `)
    if (role.name !== 'lotos_parent_reader' || role.elevated || role.can_create || role.can_write) {
      throw new Error('CRM read-only role is not correctly restricted')
    }
    const value = await work(db)
    await db.query('COMMIT')
    return value
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    db.release()
  }
}
type ClientRow = {
  id: string
  child_name: string
  birth_date: string | null
  category: string
  lessons_per_week: number
  status: Child['status']
  branch_name: string
  time_zone: string
  remaining_lessons: number
}
const childColumns = `c.id,c.child_name,to_char(c.birth_date,'YYYY-MM-DD') AS birth_date,c.category,c.lessons_per_week,c.status,
 b.name AS branch_name,b.time_zone,c.remaining_lessons`
function child(row: ClientRow): Child {
  return {
    id: row.id,
    name: row.child_name,
    birthDate: row.birth_date,
    category: row.category,
    lessonsPerWeek: row.lessons_per_week,
    status: row.status,
    branchName: row.branch_name,
    timeZone: row.time_zone,
  }
}
const lessonColumns = `l.id,l.title,to_char(l.local_date,'YYYY-MM-DD') AS local_date,l.starts_at,l.ends_at,l.time_zone,l.location,
 co.name AS coach_name,l.status,a.status AS attendance`
const lessonJoins = `FROM public.lesson_enrollments e JOIN public.lessons l ON l.id=e.lesson_id AND l.branch_id=e.branch_id
 JOIN public.coaches co ON co.id=l.coach_id
 LEFT JOIN public.attendance a ON a.lesson_id=l.id AND a.client_id=e.client_id AND a.branch_id=e.branch_id`
type LessonRow = {
  id: string
  title: string
  local_date: string
  starts_at: Date
  ends_at: Date
  time_zone: string
  location: string | null
  coach_name: string | null
  status: Lesson['status']
  attendance: Lesson['attendance']
}
function lesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    title: row.title,
    localDate: row.local_date,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    timeZone: row.time_zone,
    location: row.location,
    coachName: row.coach_name,
    status: row.status,
    attendance: row.attendance,
  }
}
export async function readChildren(runtime: Databases, userId: string) {
  const links = await runtime.parent.parentChildLink.findMany({
    where: { parentUserId: userId, revokedAt: null },
    select: { crmClientId: true },
  })
  if (!links.length) return []
  const values = await withCrmRead(runtime, async (db) => {
    const result = await db.query<ClientRow>(
      'SELECT ' +
        childColumns +
        ' FROM public.clients c JOIN public.branches b ON b.id=c.branch_id WHERE c.id=ANY($1::text[]) ORDER BY c.child_name,c.id',
      [links.map((link) => link.crmClientId)],
    )
    return result.rows.map(child)
  })
  // Revalidate after the cross-database read, including link revocation.
  const active = await runtime.parent.parentChildLink.findMany({
    where: { parentUserId: userId, revokedAt: null, user: { enabled: true } },
    select: { crmClientId: true },
  })
  return values.filter((value) => active.some((link) => link.crmClientId === value.id))
}
export async function readPaymentsPage(
  db: PoolClient,
  clientId: string,
  cursor?: string,
): Promise<PaymentPage> {
  let after: z.infer<typeof cursorSchema> | undefined
  if (cursor) {
    try {
      after = cursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')))
    } catch {
      throw new ApiError(400, 'INVALID_CURSOR', 'Неверная страница оплат.')
    }
  }
  const result = await db.query<{
    id: string
    paid_at: Date
    amount_minor: string
    lessons_added: number
    package_lessons: number
  }>(
    'SELECT id,paid_at,amount_minor,lessons_added,package_lessons FROM public.payments WHERE client_id=$1 ' +
      (after ? 'AND (paid_at,id)<($2::timestamptz,$3::text) ' : '') +
      'ORDER BY paid_at DESC,id DESC LIMIT 21',
    after ? [clientId, after.date, after.id] : [clientId],
  )
  const items: Payment[] = result.rows.slice(0, 20).map((row) => ({
    id: row.id,
    paidAt: row.paid_at.toISOString(),
    amountMinor: row.amount_minor,
    lessonsAdded: row.lessons_added,
    packageLessons: row.package_lessons,
  }))
  const last = items.at(-1)
  return {
    items,
    nextCursor:
      result.rows.length > 20 && last
        ? Buffer.from(JSON.stringify({ date: last.paidAt, id: last.id })).toString('base64url')
        : null,
  }
}
export async function parentPayments(runtime: Databases, userId: string, clientId: string, cursor?: string) {
  idSchema.parse(clientId)
  await requireChild(runtime, userId, clientId)
  const value = await withCrmRead(runtime, (db) => readPaymentsPage(db, clientId, cursor))
  await requireChild(runtime, userId, clientId)
  return value
}
export async function readOverview(
  runtime: Databases,
  userId: string,
  clientId: string,
  week?: string,
): Promise<Overview> {
  idSchema.parse(clientId)
  if (week) daySchema.parse(week)
  await requireChild(runtime, userId, clientId)
  const value = await withCrmRead(runtime, async (db) => {
    const {
      rows: [row],
    } = await db.query<ClientRow>(
      'SELECT ' +
        childColumns +
        ' FROM public.clients c JOIN public.branches b ON b.id=c.branch_id WHERE c.id=$1',
      [clientId],
    )
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Ребёнок не найден.')
    const now = new Date(),
      today = localDay(row.time_zone, now),
      from = addDays(today, -29)
    const weekStart = mondayOf(week || today),
      weekEnd = addDays(weekStart, 6)
    if (weekStart < addDays(today, -366) || weekStart > addDays(today, 366))
      throw new ApiError(400, 'DATE_RANGE', 'Выберите неделю в пределах года.')
    const next = await db.query<LessonRow>(
      'SELECT ' +
        lessonColumns +
        ' ' +
        lessonJoins +
        " WHERE e.client_id=$1 AND e.status='active' AND l.status='scheduled' AND l.ends_at>$2 ORDER BY l.starts_at,l.id LIMIT 1",
      [clientId, now],
    )
    const schedule = await db.query<LessonRow>(
      'SELECT ' +
        lessonColumns +
        ' ' +
        lessonJoins +
        " WHERE e.client_id=$1 AND e.status='active' AND l.local_date BETWEEN $2::date AND $3::date ORDER BY l.starts_at,l.id",
      [clientId, weekStart, weekEnd],
    )
    const periodFilter =
      " WHERE e.client_id=$1 AND (e.status='active' OR a.id IS NOT NULL) AND l.status<>'cancelled' AND l.local_date BETWEEN $2::date AND $3::date AND l.ends_at<=$4"
    const {
      rows: [stats],
    } = await db.query<{ attended: number; absent: number; unmarked: number }>(
      "SELECT count(*) FILTER (WHERE a.status='attended')::int AS attended,count(*) FILTER (WHERE a.status='absent')::int AS absent,count(*) FILTER (WHERE a.id IS NULL)::int AS unmarked " +
        lessonJoins +
        periodFilter,
      [clientId, from, today, now],
    )
    const history = await db.query<LessonRow>(
      'SELECT ' +
        lessonColumns +
        ' ' +
        lessonJoins +
        periodFilter +
        ' ORDER BY l.starts_at DESC,l.id DESC LIMIT 101',
      [clientId, from, today, now],
    )
    const marked = stats.attended + stats.absent
    return {
      child: child(row),
      remainingLessons: row.remaining_lessons,
      weekStart,
      weekEnd,
      nextLesson: next.rows[0] ? lesson(next.rows[0]) : null,
      schedule: schedule.rows.map(lesson),
      attendance: {
        ...stats,
        percent: marked ? Math.round((stats.attended / marked) * 100) : null,
        from,
        to: today,
      },
      history: history.rows.slice(0, 100).map(lesson),
      historyHasMore: history.rows.length > 100,
      payments: await readPaymentsPage(db, clientId),
      updatedAt: now.toISOString(),
    }
  })
  await requireChild(runtime, userId, clientId)
  return value
}
