import { RefreshCw, Waves } from 'lucide-react'
import { ConfigurationError } from '@/lib/server/config'

export function ConnectionUnavailable({ error }: { error: unknown }) {
  const configuration = error instanceof ConfigurationError
  console.error('parent-connection-unavailable', {
    kind: configuration ? 'configuration' : 'crm-api',
  })
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-navy)] p-5">
      <section className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-[var(--shadow-float)] sm:p-10">
        <Waves className="text-[var(--color-accent)]" size={36} aria-hidden="true" />
        <p className="mt-6 text-sm font-bold text-[var(--color-muted)]">Лотос · Кабинет родителя</p>
        <h1 className="mt-2 text-3xl font-black">Кабинет временно недоступен</h1>
        <p role="alert" className="mt-4 leading-7 text-[var(--color-muted)]">
          Не удалось подключиться к сервису клуба. Попробуйте обновить страницу позже. Если проблема
          сохраняется, сообщите администратору клуба.
        </p>
        {process.env.NODE_ENV === 'development' && configuration && (
          <p className="mt-4 rounded-xl bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">
            Проверьте серверные настройки подключения в .env.local и выполните npm run env:check.
          </p>
        )}
        <a
          href="/"
          className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--color-accent)] px-5 font-bold text-white"
        >
          <RefreshCw size={18} aria-hidden="true" /> Обновить страницу
        </a>
      </section>
    </main>
  )
}
