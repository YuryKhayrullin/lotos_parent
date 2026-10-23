'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Cookie, LockKeyhole, X } from 'lucide-react'
import { cookieNoticeDismissed, cookieNoticeKey } from '@/lib/legal/cookie-notice'

export function CookieNotice() {
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    try {
      setVisible(!cookieNoticeDismissed(localStorage.getItem(cookieNoticeKey), Date.now()))
    } catch {
      setVisible(true)
    }
  }, [])
  useEffect(() => {
    const element = dialog.current
    if (!settings || !element) return
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    return () => {
      element.close()
      focus?.focus()
    }
  }, [settings])
  const dismiss = () => {
    try {
      localStorage.setItem(cookieNoticeKey, JSON.stringify({ dismissedAt: Date.now() }))
    } catch {
      /* Browser storage is optional. */
    }
    setVisible(false)
  }
  return (
    <>
      <footer className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 pb-28 pt-5 text-xs text-slate-500">
        <Link href="/legal/privacy" className="flex min-h-11 items-center">
          Политика конфиденциальности
        </Link>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-cyan-800"
          onClick={() => setSettings(true)}
        >
          <Cookie size={15} />
          Настройки cookies
        </button>
      </footer>
      {visible && (
        <aside
          aria-label="Уведомление о cookies"
          className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-cyan-100 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <Cookie size={24} className="mt-1 shrink-0 text-cyan-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Cookies для безопасного входа</p>
              <p className="mt-1 text-xs leading-6 text-slate-600">
                Кабинету нужны служебные cookies авторизации. Рекламные счётчики и аналитика не подключены.
                Закрытие уведомления не является согласием на обработку данных.
              </p>
              <Link
                href="/legal/privacy"
                className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-cyan-800 underline underline-offset-4"
              >
                Политика конфиденциальности
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={dismiss}
                  className="min-h-11 rounded-xl bg-cyan-700 px-5 text-sm font-semibold text-white"
                >
                  Понятно
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(true)}
                  className="min-h-11 px-1 text-xs font-medium text-cyan-800"
                >
                  Подробнее о cookies
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
      {settings && (
        <dialog
          ref={dialog}
          aria-labelledby="cookie-settings-title"
          onCancel={() => setSettings(false)}
          className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="cookie-settings-title" className="text-xl font-bold tracking-tight">
              Cookies кабинета
            </h2>
            <button
              type="button"
              aria-label="Закрыть настройки cookies"
              onClick={() => setSettings(false)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200"
            >
              <X size={19} />
            </button>
          </div>
          <div className="mt-5 rounded-2xl bg-cyan-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
              <LockKeyhole size={17} />
              Необходимые · для входа
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Без cookie сеанса сервер не сможет проверить ваш доступ. Отключить их можно в браузере; тогда
              войти в кабинет не получится.
            </p>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Аналитические и рекламные технологии не подключены. Здесь нет скрытого разрешения на их включение.
            Настройка закрытия уведомления хранится только в этом браузере до 180 дней.
          </p>
          <Link
            href="/legal/cookies"
            onClick={() => setSettings(false)}
            className="mt-4 flex min-h-11 items-center text-sm font-semibold text-cyan-800"
          >
            Открыть документ о cookies →
          </Link>
        </dialog>
      )}
    </>
  )
}
