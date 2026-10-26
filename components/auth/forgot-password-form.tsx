'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { LegalLinks } from '@/components/legal/legal-links'
import { Brand } from '@/components/ui/brand'
import { requestJson } from '@/lib/api-client'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-canvas)] p-4 sm:p-7">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
        <Brand />
        <div className="mt-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Личный кабинет</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Восстановить пароль
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Укажите email, на который был оформлен доступ к кабинету родителя.
          </p>
        </div>

        {sent ? (
          <div className="mt-7">
            <div role="status" className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
              <MailCheck className="text-cyan-700" aria-hidden="true" />
              <p className="mt-3 font-semibold text-slate-900">Проверьте почту</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Если кабинет с таким email существует, мы отправили одноразовую ссылку. Она действует один
                час.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-5 inline-flex min-h-11 items-center font-semibold text-cyan-700"
            >
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form
            className="mt-7 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (busy) return
              setBusy(true)
              setError('')
              try {
                await requestJson<{ accepted: true }>('/api/auth/request-password-reset', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email }),
                })
                setSent(true)
              } catch (reason) {
                setError(
                  reason instanceof Error ? reason.message : 'Не удалось отправить письмо. Попробуйте позже.',
                )
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
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                value={email}
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
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
              className="min-h-12 w-full rounded-xl bg-cyan-700 px-5 font-semibold text-white shadow-lg shadow-cyan-700/15 hover:bg-cyan-800 disabled:opacity-50"
            >
              {busy ? 'Отправляем…' : 'Получить ссылку'}
            </button>
            <Link href="/login" className="block min-h-11 pt-3 text-center font-semibold text-cyan-700">
              Вернуться ко входу
            </Link>
          </form>
        )}
        <LegalLinks />
      </section>
    </main>
  )
}
