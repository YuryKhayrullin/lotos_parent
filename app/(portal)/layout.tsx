import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PortalProvider } from '@/components/portal/portal-provider'
import { PortalShell } from '@/components/portal/portal-shell'
import { databases } from '@/lib/server/database'
import { getAuth } from '@/lib/server/auth'
import { requireParent } from '@/lib/server/access'
import { readChildren, readOverview } from '@/lib/server/crm-read'
import { ApiError } from '@/lib/server/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function bootstrap() {
  try {
    const runtime = databases()
    const actor = await requireParent(runtime, new Headers(await headers()), getAuth())
    const children = await readChildren(runtime, actor.user.id)
    const overview = children[0] ? await readOverview(runtime, actor.user.id, children[0].id) : null
    return { user: actor.user, children, overview }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const data = await bootstrap()
  if (!data) redirect('/login')

  return (
    <PortalProvider
      initialUser={{ id: data.user.id, name: data.user.name }}
      initialChildren={data.children}
      initialOverview={data.overview}
    >
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  )
}
