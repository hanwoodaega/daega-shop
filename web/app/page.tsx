'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import CategoryGrid from '@/components/CategoryGrid'
import FlashSaleSection from '@/components/FlashSaleSection'
import BestSection from '@/components/BestSection'
import SaleSection from '@/components/SaleSection'
import HanwooNo9Section from '@/components/HanwooNo9Section'
import RecommendationSection from '@/components/RecommendationSection'

export default function Home() {

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* 히어로 섹션 */}
        <section className="bg-black text-white py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 text-center">
          </div>
        </section>

        {/* 카테고리 - 모바일만 표시 */}
        <section className="py-3 bg-white md:hidden">
          <div className="container mx-auto px-4">
            <CategoryGrid selectedCategory="" />
          </div>
        </section>

        {/* 타임딜/플래시 세일 섹션 */}
        <FlashSaleSection />

        {/* 베스트 섹션 */}
        <BestSection />

        {/* 특가 섹션 */}
        <SaleSection />

        {/* 한우대가 NO.9 섹션 */}
        <HanwooNo9Section />

        {/* 취향별 추천 섹션 */}
        <RecommendationSection />
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}

