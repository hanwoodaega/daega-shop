'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { useTimeDeal } from '@/lib/timedeal'
import TimeDealHeader from './_components/TimeDealHeader'
import TimeDealProductGrid from './_components/TimeDealProductGrid'

export default function TimeDealPageClient() {
  const { timedealData, loading } = useTimeDeal()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </main>
        <ScrollToTop />
        <Footer />
        <BottomNavbar />
        <PromotionModalWrapper />
      </div>
    )
  }

  if (!timedealData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">⏰</div>
            <p className="text-xl text-gray-600 mb-2">
              진행 중인 타임딜이 없습니다
            </p>
            <Link href="/products">
              <button className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                전체 상품 보기
              </button>
            </Link>
          </div>
        </main>
        <ScrollToTop />
        <Footer />
        <BottomNavbar />
        <PromotionModalWrapper />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TimeDealHeader title={timedealData.title || '타임딜'} />

      <main className="flex-1">
        <TimeDealProductGrid data={timedealData} />
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}


