import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '대가 정육백화점',
  description: '신선한 한우와 고급 정육을 만나보세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}

