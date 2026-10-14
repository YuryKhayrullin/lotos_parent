import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Лотос — кабинет родителя',
  description: 'Расписание, посещаемость и абонемент вашего ребёнка',
  robots: { index: false, follow: false },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
