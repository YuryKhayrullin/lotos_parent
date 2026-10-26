'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LegalLinks } from '@/components/legal/legal-links'
import { Brand } from '@/components/ui/brand'
import { PasswordInput } from '@/components/ui/password-input'
import { requestJson } from '@/lib/api-client'

type LinkState =
  'checking' | 'valid' | 'invalid' | 'expired' | 'revoked' | 'activated' | 'used' | 'unavailable'
const explanations: Partial<Record<LinkState, string>> = {
  invalid: 'Откройте полную ссылку, которую передал администратор клуба.',
  expired: 'Срок действия ссылки истёк. Попросите администратора клуба выдать новую.',
  revoked: 'Ссылка или доступ отозваны. Уточните доступ у администратора клуба.',
  activated:
    'Кабинет уже активирован. Войдите с вашим email и паролем. Если пароль забыт, администратор выдаст ссылку восстановления.',
  used: 'Пароль по этой ссылке уже изменён. Войдите с новым паролем.',
  unavailable: 'Не удалось проверить ссылку. Проверьте соединение и повторите проверку.',
}
export function ActivationForm({ recovery = false }: { recovery?: boolean }) {
  const router = useRouter()
  const token = useRef('')
  const [state, setState] = useState<LinkState>('checking')
  const [revision, setRevision] = useState(0)
  const [shared, setShared] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    token.current ||= new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
    window.history.replaceState(null, '', window.location.pathname)
    if (!token.current) {
      setState('invalid')
      return
    }
    const controller = new AbortController()
    setState('checking')
    void requestJson<{ state: LinkState; sharedAccount?: boolean }>(
      '/api/auth/' + (recovery ? 'recovery-status' : 'invitation-status'),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token.current }),
        signal: controller.signal,
      },
    )
      .then((result) => {
        if (controller.signal.aborted) return
        setState(result.state)
        setShared(result.sharedAccount === true)
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('unavailable')
      })
    return () => controller.abort()
  }, [recovery, revision])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-canvas)] p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
        <Brand />
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-900">
          {recovery ? 'Восстановление доступа' : 'Активация кабинета'}
        </h1>
        {done ? (
          <>
            <p role="status" className="my-5 text-sm leading-6 text-slate-600">
              {recovery
                ? 'Пароль изменён. Прежние сеансы закрыты. Войдите с новым паролем.'
                : 'Доступ активирован. Войдите с вашим email и паролем.'}
            </p>
            <Link href="/login" className="font-semibold text-cyan-700">
              Перейти ко входу
            </Link>
          </>
        ) : state === 'valid' ? (
          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (busy) return
              if (password !== confirmation) {
                setError('Пароли не совпадают.')
                return
              }
              setError('')
              setBusy(true)
              try {
                const result = await requestJson<{ success: true; signedIn?: boolean }>(
                  '/api/auth/' + (recovery ? 'reset-password' : 'activate'),
                  {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ token: token.current, password }),
                  },
                )
                token.current = ''
                setPassword('')
                setConfirmation('')
                setDone(true)
                if (result.signedIn) {
                  router.replace('/')
                  router.refresh()
                }
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : 'Не удалось сохранить пароль')
                setRevision((value) => value + 1)
              } finally {
                setBusy(false)
              }
            }}
          >
            <p className="text-sm leading-6 text-slate-500">
              {recovery
                ? 'Задайте новый пароль. Ссылка одноразовая, действует один час.'
                : 'Установите пароль для доступа к расписанию, посещаемости и абонементам ваших детей.'}
            </p>
            {shared && (
              <p role="note" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Это общий аккаунт сотрудника и родителя. Новый пароль будет действовать и в CRM. Все прежние
                сеансы в обоих кабинетах закроются.
              </p>
            )}
            {['Новый пароль', 'Повторите пароль'].map((label, index) => (
              <label key={label} className="block text-sm font-medium text-slate-700">
                {label}
                <PasswordInput
                  required
                  minLength={12}
                  maxLength={200}
                  autoComplete="new-password"
                  value={index ? confirmation : password}
                  disabled={busy}
                  onChange={(event) =>
                    index ? setConfirmation(event.target.value) : setPassword(event.target.value)
                  }
                />
              </label>
            ))}
            <p className="text-xs text-slate-500">Не менее 12 символов.</p>
            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="min-h-12 w-full rounded-xl bg-cyan-700 px-5 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Сохраняем…' : recovery ? 'Сохранить новый пароль' : 'Активировать кабинет'}
            </button>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <p role="status" className="text-sm leading-6 text-slate-600">
              {state === 'checking' ? 'Проверяем ссылку…' : explanations[state]}
            </p>
            {state === 'unavailable' && (
              <button
                className="min-h-11 font-semibold text-cyan-700"
                onClick={() => setRevision((value) => value + 1)}
              >
                Повторить проверку
              </button>
            )}
            <Link href="/login" className="block font-semibold text-cyan-700">
              Перейти ко входу
            </Link>
          </div>
        )}
        <LegalLinks />
      </section>
    </main>
  )
}
