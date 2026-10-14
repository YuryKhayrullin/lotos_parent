import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { databases } from '@/lib/server/database'
import { getAuth } from '@/lib/server/auth'
import { requireParent } from '@/lib/server/access'
import { ApiError } from '@/lib/server/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  try {
    const runtime = databases()
    await requireParent(runtime, new Headers(await headers()), getAuth())
    redirect('/')
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
  }

  return <LoginForm />
}
