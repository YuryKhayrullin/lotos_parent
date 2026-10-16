'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Brand } from '@/components/ui/brand'
import { requestJson } from '@/lib/api-client'

type Identity = { id: string; name: string }

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-canvas)] p-4 sm:p-7">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
        <Brand />
        <div className="mt-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Личный кабинет</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Войдите в кабинет
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Расписание, посещаемость и абонемент ребёнка. Доступ выдаёт администратор клуба.
          </p>
        </div>

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
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              required
              type="email"
              autoComplete="username"
              inputMode="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-normal text-slate-900"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Пароль
            <input
              required
              type="password"
              autoComplete="current-password"
              maxLength={200}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-normal text-slate-900"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 font-semibold text-white shadow-lg shadow-cyan-700/15 transition-colors hover:bg-cyan-800 disabled:opacity-50"
          >
            {busy ? 'Входим…' : 'Открыть кабинет'}
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6 flex gap-3 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
          <ShieldCheck size={19} className="mt-0.5 shrink-0 text-cyan-700" />
          <p className="text-xs leading-5 text-slate-600">
            Если доступ ещё не выдан или пароль забыт, обратитесь к администратору клуба.
          </p>
        </div>
      </section>
    </main>
  )
}
