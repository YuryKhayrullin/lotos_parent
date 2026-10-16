import { RefreshCw } from 'lucide-react'
import { Brand } from '@/components/ui/brand'
import { ConfigurationError } from '@/lib/server/config'

export function ConnectionUnavailable({ error }: { error: unknown }) {
  const configuration = error instanceof ConfigurationError
  console.error('parent-connection-unavailable', {
    kind: configuration ? 'configuration' : 'crm-api',
  })
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-canvas)] p-5">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10">
        <Brand />
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Кабинет временно недоступен
        </h1>
        <p role="alert" className="mt-4 leading-7 text-slate-500">
          Не удалось подключиться к сервису клуба. Попробуйте обновить страницу позже. Если проблема
          сохраняется, сообщите администратору клуба.
        </p>
        {process.env.NODE_ENV === 'development' && configuration && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Проверьте серверные настройки подключения в .env.local и выполните npm run env:check.
          </p>
        )}
        <a
          href="/"
          className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-cyan-700 px-5 font-semibold text-white hover:bg-cyan-800"
        >
          <RefreshCw size={18} aria-hidden="true" /> Обновить страницу
        </a>
      </section>
    </main>
  )
}
