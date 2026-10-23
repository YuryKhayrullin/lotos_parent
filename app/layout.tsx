import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { CookieNotice } from '@/components/legal/cookie-notice'

export const metadata: Metadata = {
  title: 'Лотос — кабинет родителя',
  description: 'Расписание, посещаемость и абонемент вашего ребёнка',
  robots: { index: false, follow: false },
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await headers()
  return (
    <html lang="ru">
      <body>
        {children}
        <CookieNotice />
      </body>
    </html>
  )
}
