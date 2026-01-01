'use client'

import Link from 'next/link'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { TimeDealData } from '@/lib/timedeal'
import { TimeDealUI } from '@/components/timedeal/TimeDealUI'

interface TimeDealProductGridProps {
  data: TimeDealData
}

export default function TimeDealProductGrid({ data }: TimeDealProductGridProps) {
  if (!data) {
    return null
  }

  // TimeDealUI가 내부에서 products length 0이면 null 반환
  return (
    <>
      {data ? (
        <TimeDealUI data={data} variant="grid" />
      ) : (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* 전체보기 버튼 */}
      <div className="mt-4 px-4 pb-4 bg-white">
        <Link href="/products" prefetch={false} className="block">
          <button className="w-full px-2 py-2.5 rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 bg-white text-black border border-gray-300">
            <span>전체 상품 보기</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Link>
      </div>
    </>
  )
}


