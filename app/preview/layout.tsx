import { notFound } from 'next/navigation'
import { PortalProvider } from '@/components/portal/portal-provider'
import { PortalShell } from '@/components/portal/portal-shell'
import { createPreview } from '@/lib/preview'

export const dynamic = 'force-dynamic'

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.APP_ENV !== 'local' || process.env.PARENT_PREVIEW !== '1' || process.env.VERCEL === '1')
    notFound()

  const preview = createPreview()
  return (
    <PortalProvider
      initialUser={{ id: 'preview', name: preview.parentName }}
      initialChildren={preview.children}
      initialOverview={preview.overviews[preview.children[0]?.id] ?? null}
      previewData={preview}
      basePath="/preview"
    >
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  )
}
