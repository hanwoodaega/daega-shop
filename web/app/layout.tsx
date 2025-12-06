import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from '@/components/ClientLayout'
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
          containerStyle={{
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#1e293b',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e5e7eb',
            },
            success: {
              duration: 2500,
              style: {
                background: '#fff',
                color: '#059669',
                border: '1px solid #10b981',
              },
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              style: {
                background: '#fff',
                color: '#dc2626',
                border: '1px solid #ef4444',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
