import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { parentSession } from '@/lib/server/crm-api'
import { ConnectionUnavailable } from '@/components/connection-unavailable'
import { ApiError, isConnectionFailure } from '@/lib/server/errors'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export default async function LoginPage() {
  let authenticated = false
  try {
    await parentSession(new Headers(await headers()))
    authenticated = true
  } catch (error) {
    if (isConnectionFailure(error)) return <ConnectionUnavailable error={error} />
    if (!(error instanceof ApiError) || error.status !== 401) throw error
  }
  if (authenticated) redirect('/')
  return <LoginForm />
}
