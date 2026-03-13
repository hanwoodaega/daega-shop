import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from '@/components/layout/ClientLayout'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: '대가정육마트',
  description: '신선한 한우와 고급 정육을 만나보세요',
  keywords: ['한우', '정육', '한돈', '수입육', '고기', '대가'],
  openGraph: {
    title: '대가정육마트',
    description: '신선한 한우와 고급 정육을 만나보세요',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <ClientLayout>{children}</ClientLayout>
        <Toaster
          position="top-center"
          containerStyle={{ top: '50%', transform: 'translateY(-50%)' }}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#000',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #000',
            },
            success: {
              duration: 1500,
              icon: null,
              style: {
                background: '#fff',
                color: '#000',
                border: '1px solid #000',
              },
            },
            error: {
              duration: 4000,
              icon: null,
              style: {
                background: '#fff',
                color: '#000',
                border: '1px solid #000',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
