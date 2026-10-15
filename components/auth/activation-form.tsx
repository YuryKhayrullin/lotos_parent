'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
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
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-navy)] p-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-7">
        <h1 className="text-2xl font-black">Кабинет родителя</h1>
        {done ? (
          <>
            <p className="my-5">
              Доступ активирован. Войдите с email, на который выдано приглашение, и вашим паролем.
            </p>
            <Link href="/login" className="font-bold text-[var(--color-accent)]">
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
            <p className="text-sm text-[var(--color-muted)]">
              Установите пароль для доступа к расписанию, посещаемости и абонементу ребёнка.
            </p>
            <label className="block text-sm font-bold">
              Новый пароль
              <input
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border p-3"
              />
            </label>
            <p className="text-xs text-[var(--color-muted)]">Не менее 12 символов.</p>
            <label className="block text-sm font-bold">
              Повторите пароль
              <input
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border p-3"
              />
            </label>
            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="min-h-12 w-full rounded-xl bg-[var(--color-accent)] px-5 font-bold text-white disabled:opacity-50"
            >
              {busy ? 'Активируем…' : 'Активировать кабинет'}
            </button>
            <Link href="/login" className="block text-center text-sm">
              Уже активировали? Войти
            </Link>
          </form>
        )}
      </section>
    </main>
  )
}
