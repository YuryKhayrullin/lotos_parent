import { localDay, type Overview, type SubscriptionPeriod } from './contracts'
export function subscriptionPresentation(overview: Overview) {
  const today = localDay(overview.child.timeZone, new Date(overview.updatedAt))
  const items = overview.subscription?.items || []
  const active = items
    .filter((row) => row.startsOn <= today && row.endsOn >= today && row.remainingLessons > 0)
    .sort((a, b) => a.endsOn.localeCompare(b.endsOn))
  const next = items
    .filter((row) => row.startsOn > today && row.remainingLessons > 0)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0]
  const current: SubscriptionPeriod | undefined =
    active[0] ||
    items.filter((row) => row.startsOn <= today).sort((a, b) => b.endsOn.localeCompare(a.endsOn))[0] ||
    next
  const remaining = overview.subscription?.availableLessons ?? overview.remainingLessons
  const daysLeft = current
    ? Math.max(
        0,
        Math.round((Date.parse(current.endsOn + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000),
      )
    : null
  const upcoming = Boolean(current && current.startsOn > today)
  const expired = Boolean(current && current.endsOn < today)
  const hasNext = Boolean(next && current && next.id !== current.id)
  const remind = Boolean(
    current && !upcoming && !hasNext && (expired || remaining <= 2 || (daysLeft !== null && daysLeft <= 5)),
  )
  return { current, next: hasNext ? next : undefined, remaining, daysLeft, upcoming, expired, remind }
}
