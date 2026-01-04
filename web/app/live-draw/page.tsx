import { Suspense } from 'react'
import LiveDrawPageClient from './LiveDrawPageClient'
import Header from '@/components/layout/Header'

export default function LiveDrawPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">로딩 중...</div>
          </div>
        }>
          <LiveDrawPageClient />
        </Suspense>
      </main>
    </div>
  )
}

