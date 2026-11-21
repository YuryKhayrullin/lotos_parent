'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Child, Overview } from '@/lib/contracts'
import { mondayOf, parseCalendarDay } from '@/lib/contracts'
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
  initialWeek: string
  initialOverview: Overview | null
  children: React.ReactNode
}

export function PortalProvider({
  initialUser,
  initialChildren,
  initialOverview,
  initialWeek,
  children,
}: PortalProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [family, setFamily] = useState(initialChildren)
  const requestedChild = searchParams.get('child') || ''
  const selectedId = family.some((child) => child.id === requestedChild)
    ? requestedChild
    : (family[0]?.id ?? '')
  const week = parseCalendarDay(searchParams.get('week'))
  const requestKey = selectedId + ':' + week
  const initialKey = initialOverview ? initialOverview.child.id + ':' + initialWeek : ''
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
      window.history.replaceState(null, '', pathname + (query ? '?' + query : ''))
    },
    [pathname, searchParams],
  )

  const selectChild = useCallback(
    (id: string) => {
      if (!family.some((child) => child.id === id)) return
      replaceParams((params) => {
        params.set('child', id)
        params.delete('week')
        params.delete('day')
      })
    },
    [family, replaceParams],
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
          setOverview(null)
          setFamily([])
          loadedKey.current = ''
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

    const load = async () => {
      const params = new URLSearchParams()
      if (selectedId) params.set('child', selectedId)
      if (week) params.set('week', week)
      const result = await requestJson<{ children: Child[]; overview: Overview | null }>(
        '/api/parent/bootstrap' + (params.size ? '?' + params : ''),
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return
      setFamily(result.children)
      const data = result.overview?.child.id === selectedId ? result.overview : null
      setOverview(data)
      loadedKey.current = requestKey
    }
    void load()
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        const status =
          reason instanceof Error && 'status' in reason
            ? Number((reason as Error & { status: number }).status)
            : 0
        if (status === 401) {
          setOverview(null)
          setFamily([])
          loadedKey.current = ''
          router.replace('/login')
          router.refresh()
          return
        }
        if (status === 404) {
          setOverview(null)
          loadedKey.current = ''
          setFamily((current) => current.filter((child) => child.id !== selectedId))
          setRevision((value) => value + 1)
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
    let timer: ReturnType<typeof setTimeout> | undefined
    const update = () => {
      clearTimeout(timer)
      if (document.visibilityState === 'visible') timer = setTimeout(refresh, 100)
    }
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearTimeout(timer)
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
      setOverview(null)
      setFamily([])
      loadedKey.current = ''
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

  const selectedChild = family.find((child) => child.id === selectedId) ?? null
  // A URL selection changes before effects run. Never pair the new child's name
  // with the previous child's overview, even for the first render.
  const visibleOverview = loadedKey.current === requestKey ? overview : null

  const value = useMemo<PortalContextValue>(
    () => ({
      user: initialUser,
      children: family,
      selectedId,
      selectedChild,
      overview: visibleOverview,
      loading: loading || (Boolean(selectedId) && loadedKey.current !== requestKey && !error),
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
      family,
      initialUser,
      loading,
      logout,
      visibleOverview,
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
