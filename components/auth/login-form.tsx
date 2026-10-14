'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck, Waves } from 'lucide-react'
import { requestJson } from '@/lib/api-client'

type Identity = { id: string; name: string }

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--color-navy)] p-4 sm:p-7">
      <div className="pointer-events-none absolute -left-32 top-[-8rem] h-96 w-96 rounded-full bg-[#167d89]/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-24 h-96 w-96 rounded-full bg-[var(--color-accent)]/25 blur-3xl" />
      <section className="relative w-full max-w-md rounded-[2rem] bg-white p-6 shadow-[var(--shadow-float)] sm:p-9">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-white">
            <Waves size={25} />
          </span>
          <div>
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Sport Club
            </p>
            <p className="text-2xl font-black tracking-[-0.04em]">Лотос</p>
          </div>
        </div>

        <p className="mt-10 text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Кабинет родителя
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">Войдите в кабинет</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          Расписание, посещаемость и абонемент ребёнка. Доступ выдаёт администратор клуба.
        </p>

        <form
          className="mt-7 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            setError('')
            try {
              await requestJson<{ user: Identity }>('/api/auth/sign-in/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
              })
              router.replace('/')
              router.refresh()
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'Не удалось войти.')
            } finally {
              setBusy(false)
            }
          }}
        >
          <label className="block text-sm font-bold">
            Email
            <input
              required
              type="email"
              autoComplete="username"
              inputMode="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-13 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 font-normal text-[var(--color-ink)]"
            />
          </label>
          <label className="block text-sm font-bold">
            Пароль
            <input
              required
              type="password"
              autoComplete="current-password"
              maxLength={200}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 min-h-13 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 font-normal text-[var(--color-ink)]"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] px-5 font-extrabold text-white shadow-lg shadow-purple-950/10 disabled:opacity-50"
          >
            {busy ? 'Входим…' : 'Открыть кабинет'}
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6 flex gap-3 rounded-2xl bg-[var(--color-surface-soft)] p-4">
          <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
          <p className="text-xs leading-5 text-[var(--color-ink-soft)]">
            Если доступ ещё не выдан или пароль забыт, обратитесь к администратору клуба.
          </p>
        </div>
      </section>
    </main>
  )
}
