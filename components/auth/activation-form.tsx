'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brand } from '@/components/ui/brand'
import { requestJson } from '@/lib/api-client'

export function ActivationForm() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') || '')
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-canvas)] p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
        <Brand />
        <h1 className="mt-9 text-2xl font-bold tracking-tight text-slate-900">Активация кабинета</h1>
        {done ? (
          <>
            <p className="my-5 text-sm leading-6 text-slate-600">
              Доступ активирован. Войдите с email, на который выдано приглашение, и вашим паролем.
            </p>
            <Link href="/login" className="font-semibold text-cyan-700">
              Перейти ко входу
            </Link>
          </>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (!token) {
                setError('Откройте ссылку приглашения от администратора клуба.')
                return
              }
              if (password !== confirmation) {
                setError('Пароли не совпадают.')
                return
              }
              setError('')
              setBusy(true)
              try {
                await requestJson('/api/auth/activate', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ token, password }),
                })
                setToken('')
                setPassword('')
                setConfirmation('')
                setDone(true)
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : 'Не удалось активировать доступ')
              } finally {
                setBusy(false)
              }
            }}
          >
            <p className="text-sm leading-6 text-slate-500">
              Установите пароль для доступа к расписанию, посещаемости и абонементу ребёнка.
            </p>
            <label className="block text-sm font-medium text-slate-700">
              Новый пароль
              <input
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-normal text-slate-900"
              />
            </label>
            <p className="text-xs text-slate-500">Не менее 12 символов.</p>
            <label className="block text-sm font-medium text-slate-700">
              Повторите пароль
              <input
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
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
              disabled={busy}
              className="min-h-12 w-full rounded-xl bg-cyan-700 px-5 font-semibold text-white transition-colors hover:bg-cyan-800 disabled:opacity-50"
            >
              {busy ? 'Активируем…' : 'Активировать кабинет'}
            </button>
            <Link href="/login" className="block text-center text-sm text-cyan-700">
              Уже активировали? Войти
            </Link>
          </form>
        )}
      </section>
    </main>
  )
}
