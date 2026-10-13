import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: '旅行記録マップ',
  description: '写真のEXIFデータから旅の記録を地図に可視化するアプリ',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Navbar />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
