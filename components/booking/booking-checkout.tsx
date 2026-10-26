'use client'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { requestJson } from '@/lib/api-client'
import { PasswordInput } from '@/components/ui/password-input'
import { dateLabel, timeLabel, type Child } from '@/lib/contracts'
import type { BookingLesson } from '@/lib/booking-contracts'

type Hold = {
  token: string
  expiresAt: string
  state: 'held' | 'confirmed' | 'expired' | 'cancelled'
  requiresCode: boolean
  emailStatus: string
  payment: 'on_site'
}
const post = <T,>(action: string, body: unknown) =>
  requestJson<T>('/api/parent/booking/' + action, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
const field =
  'mt-1 block min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-50'
export function BookingCheckout({ lesson, onClose }: { lesson: BookingLesson; onClose: () => void }) {
  const storage = 'lotos-booking:' + lesson.id
  const [kind, setKind] = useState<'new' | 'family'>('new')
  const [children, setChildren] = useState<Child[] | null>(null)
  const [hold, setHold] = useState<Hold | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [now, setNow] = useState(Date.now())
  const pending = useRef<Record<string, unknown> | null>(null)
  const submitting = useRef(false)
  const [uncertain, setUncertain] = useState(false)
  async function run(job: () => Promise<void>) {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      await job()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось подтвердить результат. Повторите попытку.')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  useEffect(() => {
    let alive = true
    let saved: string | null = null
    try {
      saved = sessionStorage.getItem(storage)
    } catch {}
    if (saved)
      void post<Hold>('status', { token: saved })
        .then((value) => {
          if (alive) {
            setHold(value)
            setDone(value.state === 'confirmed')
          }
        })
        .catch(() => {
          if (alive) setError('Не удалось восстановить бронь. Обновите страницу для повторной проверки.')
        })
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [storage])
  function keep(value: Hold) {
    setHold(value)
    try {
      sessionStorage.setItem(storage, value.token)
    } catch {}
  }
  const expired =
    hold && (hold.state === 'expired' || hold.state === 'cancelled' || Date.parse(hold.expiresAt) <= now)
  const seconds = hold ? Math.min(900, Math.max(0, Math.ceil((Date.parse(hold.expiresAt) - now) / 1000))) : 0
  if (done)
    return (
      <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5" aria-live="polite">
        <CheckCircle2 className="text-emerald-600" />
        <h3 className="mt-3 text-xl font-bold text-emerald-900">Вы записаны</h3>
        <p className="mt-2 text-sm">
          {dateLabel(lesson.localDate, true)} · {timeLabel(lesson.startsAt, lesson.timeZone)} · {lesson.title}
        </p>
        <p className="mt-2 text-sm font-semibold">Оплата на месте. Онлайн-списания нет.</p>
        <a
          href="/login"
          className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-cyan-700 px-5 font-semibold text-white"
        >
          Открыть кабинет
        </a>
        <p className="mt-3 text-xs leading-5 text-slate-600">
          Для новой семьи кабинет создан с указанным email и паролем. Если посещение нужно изменить, свяжитесь
          с клубом.
        </p>
      </section>
    )
  return (
    <section
      className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4 sm:p-5"
      aria-label="Оформление записи"
    >
      <h3 className="text-lg font-bold">Подтверждение записи</h3>
      <p className="mt-2 text-sm text-slate-600">Оплата на месте. Место удерживается 15 минут.</p>
      {!hold ? (
        <>
          <div className="my-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {(['new', 'family'] as const).map((k) => (
              <button
                key={k}
                type="button"
                disabled={busy || uncertain}
                onClick={() => {
                  setKind(k)
                  setError('')
                  if (k === 'family')
                    void requestJson<{ children: Child[] }>('/api/parent/children')
                      .then((data) => setChildren(data.children))
                      .catch(() => undefined)
                }}
                className={
                  'min-h-11 rounded-lg px-2 text-sm font-medium ' +
                  (kind === k ? 'bg-white shadow-sm' : 'text-slate-500')
                }
              >
                {k === 'new' ? 'Новая семья' : 'Уже есть кабинет'}
              </button>
            ))}
          </div>
          {kind === 'family' && !children ? (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                const f = new FormData(e.currentTarget)
                void run(async () => {
                  await requestJson('/api/auth/sign-in/email', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
                  })
                  const data = await requestJson<{ children: Child[] }>('/api/parent/children')
                  setChildren(data.children)
                })
              }}
            >
              <label className="text-sm">
                Email
                <input
                  className={field}
                  type="email"
                  name="email"
                  autoComplete="username"
                  maxLength={254}
                  required
                  disabled={busy}
                />
              </label>
              <label className="text-sm">
                Пароль
                <PasswordInput
                  inputClassName={field}
                  name="password"
                  autoComplete="current-password"
                  maxLength={200}
                  required
                  disabled={busy}
                />
              </label>
              <button
                className="min-h-12 rounded-xl bg-cyan-700 px-4 font-semibold text-white disabled:opacity-50"
                disabled={busy}
              >
                Войти и выбрать ребёнка
              </button>
            </form>
          ) : (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                const f = new FormData(e.currentTarget)
                void run(async () => {
                  const body = pending.current || {
                    kind,
                    requestId: crypto.randomUUID(),
                    lessonId: lesson.id,
                    consent: true,
                    ...(kind === 'family'
                      ? { clientId: f.get('clientId') }
                      : {
                          email: f.get('email'),
                          parentName: f.get('parentName'),
                          childName: f.get('childName'),
                          phone: f.get('phone'),
                          birthDate: f.get('birthDate'),
                        }),
                  }
                  pending.current = body
                  setUncertain(true)
                  try {
                    const value = await post<Hold>('hold', body)
                    keep(value)
                    pending.current = null
                    setUncertain(false)
                  } catch (e) {
                    const status = (e as { status?: number }).status
                    if (status && status < 500) {
                      pending.current = null
                      setUncertain(false)
                    }
                    throw e
                  }
                })
              }}
            >
              {kind === 'family' ? (
                <label className="text-sm sm:col-span-2">
                  Ребёнок
                  <select name="clientId" required className={field} disabled={busy || uncertain}>
                    <option value="">Выберите ребёнка</option>
                    {children
                      ?.filter((c) => c.status === 'active')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.branchName} · {c.category}
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="text-sm">
                    Ваше имя
                    <input
                      className={field}
                      name="parentName"
                      maxLength={150}
                      autoComplete="name"
                      required
                      disabled={busy || uncertain}
                    />
                  </label>
                  <label className="text-sm">
                    Имя ребёнка
                    <input
                      className={field}
                      name="childName"
                      maxLength={150}
                      autoComplete="off"
                      required
                      disabled={busy || uncertain}
                    />
                  </label>
                  <label className="text-sm">
                    Дата рождения ребёнка
                    <input
                      className={field}
                      name="birthDate"
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      required
                      disabled={busy || uncertain}
                    />
                  </label>
                  <label className="text-sm">
                    Телефон
                    <input
                      className={field}
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      minLength={7}
                      maxLength={40}
                      required
                      disabled={busy || uncertain}
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    Email для кода и кабинета
                    <input
                      className={field}
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      required
                      disabled={busy || uncertain}
                    />
                  </label>
                </>
              )}
              <label className="flex items-start gap-2 text-xs leading-5 sm:col-span-2">
                <input
                  type="checkbox"
                  name="consent"
                  required
                  disabled={busy || uncertain}
                  className="mt-1"
                />
                <span>
                  Подтверждаю, что я законный представитель ребёнка, и даю{' '}
                  <a
                    className="text-cyan-800 underline"
                    href="/legal/consent"
                    target="_blank"
                    rel="noreferrer"
                  >
                    согласие на обработку данных
                  </a>{' '}
                  для записи.{' '}
                  <a
                    className="text-cyan-800 underline"
                    href="/legal/privacy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Политика конфиденциальности
                  </a>
                  .
                </span>
              </label>
              <button
                className="min-h-12 rounded-xl bg-cyan-700 px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2"
                disabled={busy}
              >
                {busy
                  ? 'Проверяем место…'
                  : uncertain
                    ? 'Проверить результат той же записи'
                    : kind === 'new'
                      ? 'Получить код и забронировать'
                      : 'Забронировать место'}
              </button>
            </form>
          )}
        </>
      ) : expired ? (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm">
          <p>Бронь истекла или занятие изменилось. Место освобождено.</p>
          <button
            type="button"
            className="mt-3 font-semibold text-cyan-800 underline"
            onClick={() => {
              try {
                sessionStorage.removeItem(storage)
              } catch {}
              setHold(null)
              pending.current = null
            }}
          >
            Выбрать заново
          </button>
        </div>
      ) : (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            void run(async () => {
              await post('confirm', {
                token: hold.token,
                ...(hold.requiresCode ? { code: f.get('code'), password: f.get('password') } : {}),
              })
              setDone(true)
              keep({ ...hold, state: 'confirmed' })
            })
          }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
            <ShieldCheck size={18} />
            Место удерживается {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </p>
          {hold.requiresCode && (
            <>
              <p className="flex items-start gap-2 text-sm text-slate-600">
                <Mail size={18} className="mt-1 shrink-0" />
                {hold.emailStatus === 'sent'
                  ? 'Код отправлен на указанный email. Проверьте также папку «Спам».'
                  : 'Отправка письма не подтверждена. Если кода нет, отмените бронь и обратитесь в клуб.'}
              </p>
              <label className="text-sm">
                Код из письма
                <input
                  className={field + ' tracking-widest'}
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  onChange={() => setError('')}
                  required
                  disabled={busy}
                />
              </label>
              <label className="text-sm">
                Создайте пароль кабинета
                <PasswordInput
                  inputClassName={field}
                  name="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={200}
                  required
                  disabled={busy}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  От 12 символов. Пароль не отправляется по почте.
                </span>
              </label>
            </>
          )}
          <button
            className="min-h-12 rounded-xl bg-cyan-700 px-4 font-semibold text-white disabled:opacity-50"
            disabled={busy}
          >
            {busy ? 'Подтверждаем…' : 'Подтвердить запись · оплата на месте'}
          </button>
          <button
            type="button"
            disabled={busy}
            className="min-h-11 text-sm text-slate-500"
            onClick={() =>
              void run(async () => {
                const cancelled = await post<{ success: true; state?: 'confirmed' }>('cancel', {
                  token: hold.token,
                })
                if (cancelled.state === 'confirmed') {
                  setDone(true)
                  keep({ ...hold, state: 'confirmed' })
                  return
                }
                try {
                  sessionStorage.removeItem(storage)
                } catch {}
                setHold(null)
                pending.current = null
                setUncertain(false)
              })
            }
          >
            Отменить бронь
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy || !!hold || uncertain}
        className="mt-3 min-h-11 text-sm text-slate-500 disabled:opacity-40"
        onClick={onClose}
      >
        Закрыть оформление
      </button>
    </section>
  )
}
