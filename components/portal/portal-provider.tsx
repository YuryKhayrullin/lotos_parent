'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Child, Overview } from '@/lib/contracts'
import { mondayOf } from '@/lib/contracts'
import { requestJson } from '@/lib/api-client'

type Identity = { id: string; name: string }

type PortalContextValue = {
  user: Identity
  children: Child[]
  selectedId: string
  selectedChild: Child | null
  overview: Overview | null
  loading: boolean
  refreshing: boolean
  error: string
  week: string
  selectChild: (id: string) => void
  selectWeek: (week: string) => void
  refresh: () => void
  logout: () => Promise<void>
  hrefFor: (route: string, options?: { day?: string; keepWeek?: boolean }) => string
}

const PortalContext = createContext<PortalContextValue | null>(null)

type PortalProviderProps = {
  initialUser: Identity
  initialChildren: Child[]
  initialOverview: Overview | null
  children: React.ReactNode
}

export function PortalProvider({
  initialUser,
  initialChildren,
  initialOverview,
  children,
}: PortalProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requestedChild = searchParams.get('child') || ''
  const selectedId = initialChildren.some((child) => child.id === requestedChild)
    ? requestedChild
    : (initialChildren[0]?.id ?? '')
  const week = searchParams.get('week') || ''
  const requestKey = selectedId + ':' + week
  const initialKey = initialOverview ? initialOverview.child.id + ':' : ''
  const [overview, setOverview] = useState<Overview | null>(
    initialKey === requestKey ? initialOverview : null,
  )
  const loadedKey = useRef(initialKey === requestKey ? requestKey : '')
  const [loading, setLoading] = useState(Boolean(selectedId) && initialKey !== requestKey)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const firstEffect = useRef(true)

  const replaceParams = useCallback(
    (change: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString())
      change(next)
      const query = next.toString()
      router.replace(pathname + (query ? '?' + query : ''), { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const selectChild = useCallback(
    (id: string) => {
      if (!initialChildren.some((child) => child.id === id)) return
      replaceParams((params) => {
        params.set('child', id)
        params.delete('week')
        params.delete('day')
      })
    },
    [initialChildren, replaceParams],
  )

  const selectWeek = useCallback(
    (day: string) => {
      replaceParams((params) => {
        params.set('week', mondayOf(day))
        params.delete('day')
      })
    },
    [replaceParams],
  )

  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const renew = () => {
      if (document.visibilityState !== 'visible') return
      void requestJson('/api/auth/get-session').catch((reason: unknown) => {
        if (reason instanceof Error && 'status' in reason && reason.status === 401) {
          router.replace('/login')
          router.refresh()
        }
      })
    }
    renew()
    const timer = window.setInterval(renew, 15 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [router])

  useEffect(() => {
    if (!selectedId) {
      setOverview(null)
      loadedKey.current = ''
      setLoading(false)
      setRefreshing(false)
      setError('')
      return
    }

    if (firstEffect.current && loadedKey.current === requestKey) {
      firstEffect.current = false
      return
    }
    firstEffect.current = false

    const controller = new AbortController()
    const changingSelection = loadedKey.current !== requestKey
    if (changingSelection) {
      setOverview(null)
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError('')

    requestJson<Overview>(
      '/api/parent/children/' +
        encodeURIComponent(selectedId) +
        '/overview' +
        (week ? '?week=' + encodeURIComponent(week) : ''),
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return
        setOverview(data)
        loadedKey.current = requestKey
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        const status =
          reason instanceof Error && 'status' in reason
            ? Number((reason as Error & { status: number }).status)
            : 0
        if (status === 401) {
          router.replace('/login')
          router.refresh()
          return
        }
        if (status === 404) {
          setOverview(null)
          loadedKey.current = ''
          router.refresh()
          return
        }
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить данные.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      })

    return () => controller.abort()
  }, [requestKey, revision, router, selectedId, week])

  useEffect(() => {
    const update = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await requestJson('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      router.replace('/login')
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось выйти. Повторите попытку.')
    }
  }, [router])

  const hrefFor = useCallback(
    (route: string, options: { day?: string; keepWeek?: boolean } = {}) => {
      const target = route
      const params = new URLSearchParams()
      if (selectedId) params.set('child', selectedId)
      if (options.keepWeek && week) params.set('week', week)
      if (options.day) params.set('day', options.day)
      const query = params.toString()
      return (target || '/') + (query ? '?' + query : '')
    },
    [selectedId, week],
  )

  const selectedChild = initialChildren.find((child) => child.id === selectedId) ?? initialChildren[0] ?? null

  const value = useMemo<PortalContextValue>(
    () => ({
      user: initialUser,
      children: initialChildren,
      selectedId,
      selectedChild,
      overview,
      loading,
      refreshing,
      error,
      week,
      selectChild,
      selectWeek,
      refresh,
      logout,
      hrefFor,
    }),
    [
      error,
      hrefFor,
      initialChildren,
      initialUser,
      loading,
      logout,
      overview,
      refresh,
      refreshing,
      selectChild,
      selectedChild,
      selectedId,
      selectWeek,
      week,
    ],
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const value = useContext(PortalContext)
  if (!value) throw new Error('usePortal must be used inside PortalProvider')
  return value
}
