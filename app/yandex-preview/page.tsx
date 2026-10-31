import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin, ShieldCheck, Waves } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Демонстрация перехода из Яндекс Карт — LOTOS',
  description: 'Безопасный staging-предпросмотр публичной записи LOTOS',
}

const steps = [
  ['1', 'Нажмите «Записаться»', 'Так посетитель перейдёт из карточки сети в общую запись LOTOS.'],
  [
    '2',
    'Выберите филиал и дату',
    'Откроются только опубликованные филиалы и занятия с реальными свободными местами.',
  ],
  ['3', 'Оформите запись', 'После подтверждения запись появится в CRM и кабинете родителя.'],
]

export default function YandexPreviewPage() {
  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
        <section
          className="relative min-h-[600px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[#eaf2e2] shadow-sm"
          aria-label="Демонстрация карточки в картах"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(35deg, transparent 45%, #fff 46%, #fff 50%, transparent 51%), linear-gradient(120deg, transparent 42%, #cbd5e1 43%, #cbd5e1 45%, transparent 46%), radial-gradient(circle at 25% 22%, #bfdbfe 0 8%, transparent 8.5%), radial-gradient(circle at 77% 72%, #bbf7d0 0 12%, transparent 12.5%)',
              backgroundSize: '180px 150px, 220px 190px, 100% 100%, 100% 100%',
            }}
          />
          <div className="relative flex min-h-[600px] flex-col">
            <header className="flex items-center justify-between gap-3 border-b border-white/80 bg-white/90 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  Симулятор перехода
                </p>
                <h1 className="mt-1 text-lg font-bold text-slate-950">Как будет работать кнопка в Картах</h1>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                Staging
              </span>
            </header>

            <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
              <article className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
                <div className="h-28 bg-gradient-to-br from-cyan-900 via-cyan-700 to-cyan-500 p-5 text-white">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Waves aria-hidden="true" size={30} />
                  </div>
                </div>
                <div className="space-y-5 p-5 sm:p-6">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-950">LOTOS</h2>
                        <p className="mt-1 text-sm text-slate-600">Спортивный клуб · бассейн</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Запись доступна
                      </span>
                    </div>
                    <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-600">
                      <MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-700" size={17} />
                      Сеть филиалов LOTOS в Москве
                    </p>
                  </div>

                  <Link
                    href="/select-city?source=yandex_maps"
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#50c51a] px-5 text-base font-bold text-white shadow-sm transition hover:bg-[#46b216] active:translate-y-px"
                  >
                    Записаться <ArrowRight aria-hidden="true" size={19} />
                  </Link>

                  <p className="text-center text-xs leading-5 text-slate-500">
                    Это безопасная имитация. Действующая ссылка YCLIENTS в Яндекс Картах не изменяется.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <aside className="portal-card h-fit p-5 sm:p-7">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <CalendarDays aria-hidden="true" size={24} />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-950">Пройдите путь посетителя</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Кнопка слева ведёт по тому же адресу, который затем будет установлен в Яндекс Бизнесе.
          </p>

          <ol className="mt-6 space-y-5">
            {steps.map(([number, title, description]) => (
              <li key={number} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-sm font-bold text-white">
                  {number}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-950">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-7 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Сейчас для пилота опубликован только «Москвич», поэтому на следующем экране будет одна карточка.
            После публикации других подготовленных филиалов выбор появится автоматически.
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
            <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" size={16} />
            Страница закрыта от поисковой индексации общими настройками кабинета родителя.
          </p>
        </aside>
      </div>
    </main>
  )
}
