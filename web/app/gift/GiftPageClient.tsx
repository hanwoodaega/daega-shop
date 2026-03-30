'use client'

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
        <section className="container mx-auto px-4 mb-6">
          <div className="w-full px-4 py-3 bg-pink-100 rounded-lg shadow-sm">
            <span className="text-base font-medium text-gray-900">소중한 분께 마음을 전하세요.</span>
          </div>
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

