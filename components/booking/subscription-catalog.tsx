import { Check, CreditCard, Waves } from 'lucide-react'
import type { PublicBranch } from '@/lib/booking-v2'

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

function categoryLabel(category: PublicBranch['tariffs'][number]['category']) {
  return category === 'swimming' ? 'Начальное плавание' : 'Синхронное плавание'
}

export function SubscriptionCatalog({
  branch,
  selectedCode = '',
}: {
  branch: PublicBranch
  selectedCode?: string
}) {
  const tariffs = branch.tariffs
  return (
    <section aria-labelledby="subscription-title">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
          Абонементы · {branch.name}
        </p>
        <h1 id="subscription-title" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
          Выберите абонемент
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Пакеты действуют 30 дней. Количество занятий зависит от выбранной частоты посещений.
        </p>
      </div>
      {!tariffs.length ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <p className="font-semibold text-slate-900">Абонементы пока не опубликованы</p>
          <p className="mt-2 text-sm text-slate-500">
            Оставьте заявку через клуб, и администратор подскажет условия.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(['swimming', 'synchronized_swimming'] as const).map((category) => {
            const items = tariffs.filter((tariff) => tariff.category === category)
            if (!items.length) return null
            return (
              <div key={category}>
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Waves size={18} className="text-cyan-700" />
                  {categoryLabel(category)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((tariff) => {
                    const selected = tariff.code === selectedCode
                    return (
                      <a
                        key={tariff.code}
                        href={
                          '/book/' +
                          encodeURIComponent(branch.id) +
                          '?service=subscription&tariff=' +
                          encodeURIComponent(tariff.code)
                        }
                        aria-current={selected ? 'true' : undefined}
                        className={`rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-cyan-700 ${selected ? 'border-cyan-500 ring-4 ring-cyan-100' : 'border-slate-200'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-bold text-slate-950">{tariff.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {tariff.lessonsCount} занятий · {tariff.validityDays} дней
                            </p>
                          </div>
                          <CreditCard size={20} className="shrink-0 text-cyan-700" />
                        </div>
                        <p className="mt-5 text-2xl font-extrabold text-slate-950">
                          {money.format(Number(tariff.priceMinor) / 100)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {tariff.lessonsPerWeek} {tariff.lessonsPerWeek === 1 ? 'раз' : 'раза'} в неделю
                        </p>
                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">
                          <Check size={16} /> Выбрать пакет
                        </span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
