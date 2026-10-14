import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import type { Databases } from './database'
import { databases } from './database'

export function createAuth(runtime: Databases) {
  return betterAuth({
    appName: 'Lotos Parent',
    baseURL: runtime.config.APP_URL,
    secret: runtime.config.BETTER_AUTH_SECRET,
    trustedOrigins: [runtime.config.APP_URL],
    database: prismaAdapter(runtime.parent, { provider: 'postgresql', transaction: true }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 200 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60, cookieCache: { enabled: false } },
    user: { additionalFields: { enabled: { type: 'boolean', defaultValue: true, input: false } } },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await runtime.parent.user.findUnique({
              where: { id: session.userId },
              select: { enabled: true },
            })
            return user?.enabled ? { data: session } : false
          },
        },
      },
    },
    rateLimit: { enabled: false },
    advanced: {
      cookiePrefix: 'lotos_parent',
      useSecureCookies: runtime.config.APP_ENV === 'staging' || runtime.config.APP_ENV === 'production',
      database: { generateId: 'uuid' },
    },
    logger: { disabled: true },
  })
}
let auth: ReturnType<typeof createAuth> | undefined
export function getAuth() {
  return (auth ??= createAuth(databases()))
}
