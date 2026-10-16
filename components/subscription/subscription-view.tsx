'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, CreditCard, ReceiptText } from 'lucide-react'
import type { PaymentPage } from '@/lib/contracts'
import { money, paymentDate } from '@/lib/contracts'
import { requestJson } from '@/lib/api-client'
import { usePortal } from '@/components/portal/portal-provider'
import { PortalScreen } from '@/components/portal/portal-screen'
import { SubscriptionSummary } from '@/components/portal/summary-cards'
import { Card, EmptyState, Eyebrow } from '@/components/ui/portal-ui'

export function SubscriptionView() {
  const portal = usePortal()
  const overview = portal.overview
  const [page, setPage] = useState<PaymentPage | null>(overview?.payments ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    setPage(overview?.payments ?? null)
    setError('')
    setBusy(false)
    controller.current?.abort()
  }, [overview?.child.id, overview?.payments, overview?.updatedAt])

  useEffect(() => () => controller.current?.abort(), [])

  return (
    <PortalScreen>
      {overview && page && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <SubscriptionSummary overview={overview} />
            </Card>
            <Card>
              <Eyebrow>Условия занятий</Eyebrow>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--color-surface-soft)] p-4">
                  <CalendarDays size={20} className="text-[var(--color-accent)]" />
                  <p className="mt-4 text-2xl font-semibold tabular">{overview.child.lessonsPerWeek}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">занятия в неделю по плану</p>
                </div>
                <div className="rounded-2xl bg-[var(--color-success-soft)] p-4">
                  <CreditCard size={20} className="text-[var(--color-success)]" />
                  <p className="mt-4 text-2xl font-semibold tabular">
                    {page.items[0] ? money(page.items[0].amountMinor) : '—'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">последняя оплата</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--color-muted)]">
                Кабинет показывает остаток и платежи, которые администратор подтвердил в CRM.
              </p>
            </Card>
          </div>

          <Card>
            <div className="flex items-end justify-between gap-4">
              <div>
                <Eyebrow>Оплаты</Eyebrow>
                <h2 className="mt-2 text-xl font-semibold">История платежей</h2>
              </div>
              <p className="text-xs font-bold text-[var(--color-muted)]">{page.items.length} записей</p>
            </div>

            {page.items.length ? (
              <div className="mt-4 divide-y divide-[var(--color-line)]">
                {page.items.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-4 py-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-success-soft)] text-[var(--color-success)]">
                      <ReceiptText size={21} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tabular">{money(payment.amountMinor)}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {paymentDate(payment.paidAt, overview.child.timeZone)}
                      </p>
                    </div>
                    <p className="shrink-0 rounded-full bg-[var(--color-surface-soft)] px-3 py-2 text-xs font-semibold">
                      +{payment.lessonsAdded} занятий
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Истории оплат пока нет"
                description="Остаток занятий может быть установлен клубом отдельно от платежа."
              />
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-2xl bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]"
              >
                {error}
              </p>
            )}

            {page.nextCursor && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const request = new AbortController()
                  controller.current?.abort()
                  controller.current = request
                  setBusy(true)
                  setError('')
                  try {
                    const result = await requestJson<PaymentPage>(
                      '/api/parent/children/' +
                        encodeURIComponent(overview.child.id) +
                        '/payments?cursor=' +
                        encodeURIComponent(page.nextCursor!),
                      { signal: request.signal },
                    )
                    if (!request.signal.aborted)
                      setPage((current) =>
                        current
                          ? {
                              items: [...current.items, ...result.items],
                              nextCursor: result.nextCursor,
                            }
                          : result,
                      )
                  } catch (reason) {
                    if (!request.signal.aborted)
                      setError(
                        reason instanceof Error ? reason.message : 'Не удалось загрузить следующие оплаты.',
                      )
                  } finally {
                    if (!request.signal.aborted) setBusy(false)
                  }
                }}
                className="mt-5 min-h-11 rounded-xl bg-cyan-700 px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Загружаем…' : 'Показать ещё'}
              </button>
            )}
          </Card>
        </div>
      )}
    </PortalScreen>
  )
}
