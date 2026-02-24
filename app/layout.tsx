import './globals.css'
import type { Metadata } from 'next'
import { SessionProvider } from '@/components/session-provider'

export const metadata: Metadata = {
  title: '公司內部看板',
  description: 'Internal Kanban Board',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
