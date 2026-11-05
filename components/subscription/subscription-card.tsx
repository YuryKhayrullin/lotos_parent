'use client'
import { CalendarDays, CheckCheck, CreditCard, BellRing } from 'lucide-react'
import { trainingFormatLabel, dateLabel, money, paymentDate, type Overview } from '@/lib/contracts'
import { subscriptionPresentation } from '@/lib/subscription-presentation'
export function SubscriptionCard({ overview }: { overview: Overview }) {
  const state = subscriptionPresentation(overview)
  const last = overview.payments.items[0]
  const status = state.current
    ? state.upcoming
      ? 'Начнётся ' + dateLabel(state.current.startsOn)
      : state.expired
        ? 'Срок закончился'
        : state.remaining === 0
          ? 'Занятия закончились'
          : 'Действует'
    : 'Подтверждённый остаток'
  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          <CreditCard size={23} />
        </span>
        <span
          className={
            'rounded-full px-3 py-1.5 text-xs font-semibold ' +
            (state.remind ? 'bg-amber-50 text-amber-900' : 'bg-cyan-50 text-cyan-800')
          }
        >
          {status}
        </span>
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Абонемент · {overview.child.branchName}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">
        {trainingFormatLabel(overview.child.trainingFormat)}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {overview.child.name} · {overview.child.lessonsPerWeek} раз в неделю
      </p>
      <div className="mt-6 flex items-end gap-3">
        <strong className="text-6xl font-semibold leading-none tracking-tight text-cyan-800 tabular-nums">
          {state.remaining}
        </strong>
        <span className="pb-1 text-sm leading-5 text-slate-500">
          занятий
          <br />
          доступно
        </span>
      </div>
      {state.current && (
        <>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-cyan-600"
              style={{
                width:
                  Math.min(
                    100,
                    Math.max(
                      0,
                      (100 * state.current.remainingLessons) / Math.max(1, state.current.totalLessons),
                    ),
                  ) + '%',
              }}
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays size={17} />
            <span>
              {dateLabel(state.current.startsOn)} — {dateLabel(state.current.endsOn)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            По {dateLabel(state.current.endsOn)} включительно · {state.current.totalLessons} занятий в пакете
          </p>
        </>
      )}
      {!state.current && (
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Срок этого абонемента пока не указан клубом. Дата последней оплаты не определяет срок автоматически.
        </p>
      )}
      {last && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span>Оплачено {paymentDate(last.paidAt, overview.child.timeZone)}</span>
          <strong className="shrink-0 text-sm text-slate-800">{money(last.amountMinor)}</strong>
        </div>
      )}
      {state.next && (
        <p className="mt-4 flex gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <CheckCheck size={18} className="shrink-0" />
          Следующий пакет уже оплачен. Начало {dateLabel(state.next.startsOn)}.
        </p>
      )}
      {state.remind && (
        <div
          role="status"
          className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
        >
          <p className="flex items-center gap-2 font-semibold">
            <BellRing size={18} />
            {state.expired
              ? 'Пора продлить абонемент'
              : state.remaining === 0
                ? 'Занятия закончились'
                : 'Скоро потребуется оплата'}
          </p>
          <p className="mt-2 text-sm leading-6">
            {state.expired
              ? 'Срок действия закончился.'
              : state.daysLeft !== null && state.daysLeft <= 5
                ? 'Срок заканчивается через ' + state.daysLeft + ' дн.'
                : 'В абонементе осталось мало занятий.'}{' '}
            Свяжитесь с администратором для продления.
          </p>
        </div>
      )}
    </div>
  )
}
