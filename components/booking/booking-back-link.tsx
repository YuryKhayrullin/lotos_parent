'use client'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
export function BookingBackLink({ fallback }: { fallback: string }) {
  const pathname = usePathname(),
    search = useSearchParams()
  const params = new URLSearchParams()
  for (const key of ['date', 'category', 'q', 'city']) {
    const value = search.get(key)
    if (value) params.set(key, value)
  }
  const href = pathname.startsWith('/book/') ? '/select-city' + (params.size ? '?' + params : '') : fallback
  return (
    <a
      href={href}
      aria-label="Назад"
      className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
    >
      <ArrowLeft size={19} />
    </a>
  )
}
