'use client'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { useGift } from '@/lib/gift'
import {
  GiftHeader,
  GiftFeaturedSection,
  GiftTargetSection,
  GiftBudgetSection,
} from './_components'

export default function GiftPageClient() {
  const {
    giftProducts,
    loading,
    selectedTarget,
    targetProducts,
    loadingTarget,
    setSelectedTarget,
    selectedBudget,
    budgetProducts,
    loadingBudget,
    setSelectedBudget,
  } = useGift()

  return (
    <div className="min-h-screen flex flex-col">
      {/* PC: 메인 헤더 + 메인메뉴 */}
      <div className="hidden lg:block">
        <Header />
      </div>
      {/* 모바일/태블릿: 선물관 전용 헤더 */}
      <div className="lg:hidden">
        <GiftHeader />
      </div>

      <main className="flex-1 pt-4 pb-20">
        <div className="lg:max-w-3xl lg:mx-auto lg:px-4">
        {/* 선물하기 설명서 버튼 */}
        <section className="container mx-auto px-4 mb-6">
          <Link
            href="/gift/guide"
            className="w-full px-4 py-3 bg-pink-100 rounded-lg hover:bg-pink-200 transition shadow-sm flex items-center justify-between block"
          >
            <div className="flex items-center gap-3">
              <span className="text-base font-medium text-gray-900">마음을 전하는 '선물하기' 이용 안내</span>
            </div>
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        <GiftFeaturedSection products={giftProducts} loading={loading} />

        <GiftTargetSection
          selectedTarget={selectedTarget}
          products={targetProducts}
          loading={loadingTarget}
          onTargetChange={setSelectedTarget}
        />

        <GiftBudgetSection
          selectedBudget={selectedBudget}
          products={budgetProducts}
          loading={loadingBudget}
          onBudgetChange={setSelectedBudget}
        />
      </div>
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

