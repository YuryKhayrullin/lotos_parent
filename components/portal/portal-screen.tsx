'use client'

import { usePortal } from './portal-provider'
import { Card, EmptyState, ErrorState, PageSkeleton } from '@/components/ui/portal-ui'

export function PortalScreen({ children }: { children: React.ReactNode }) {
  const portal = usePortal()

  if (portal.error && !portal.overview) return <ErrorState message={portal.error} retry={portal.refresh} />

  if (portal.loading && !portal.overview) return <PageSkeleton />

  if (!portal.children.length)
    return (
      <Card>
        <EmptyState
          title="Нет доступных карточек детей"
          description="Доступ ещё не выдан или был отозван. Обратитесь к администратору клуба. Если ребёнка только что добавили, нажмите «Обновить данные»."
        />
      </Card>
    )

  if (!portal.overview) return <PageSkeleton />

  return (
    <>
      {portal.error && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          {portal.error} Показаны ранее загруженные данные.
        </div>
      )}
      {children}
      <p className="mt-6 px-1 text-[0.7rem] text-[var(--color-subtle)]">
        Данные обновлены клубом. Время последнего ответа:{' '}
        {new Intl.DateTimeFormat('ru-RU', {
          timeZone: portal.overview.child.timeZone,
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(portal.overview.updatedAt))}
      </p>
    </>
  )
}
