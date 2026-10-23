import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { contentSecurityPolicy } from './lib/server/content-security-policy'

export function proxy(request: NextRequest) {
  const nonce = randomBytes(32).toString('base64')
  const policy = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === 'development',
    ['staging', 'production'].includes(process.env.APP_ENV || ''),
    request.nextUrl.pathname === '/select-city/branches' ||
      request.nextUrl.pathname === '/select-city/branches/',
  )
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('content-security-policy', policy)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('content-security-policy', policy)
  response.headers.set('cache-control', 'private, no-store, max-age=0')
  return response
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next/static(?:/|$)|_next/image(?:/|$)|favicon\\.ico$).*)'],
}
