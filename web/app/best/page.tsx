'use client'

import { Suspense } from 'react'
import CollectionContent from './CollectionContent'

export default function BestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-4 py-4 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-lg aspect-square"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <CollectionContent type="best" />
    </Suspense>
  )
}


