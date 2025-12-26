import { Suspense } from 'react'
import GiftPageClient from './GiftPageClient'
import GiftSkeleton from './_components/GiftSkeleton'

export default function GiftPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                선물관
              </h1>
            </div>
          </div>
        </div>
        <main className="flex-1 pt-4 pb-20">
          <div className="container mx-auto px-4 mb-8">
            <GiftSkeleton />
          </div>
        </main>
      </div>
    }>
      <GiftPageClient />
    </Suspense>
  )
}
