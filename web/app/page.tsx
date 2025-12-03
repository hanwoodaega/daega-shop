'use client'

import Link from 'next/link'
import Image from 'next/image'
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
        <section className="relative bg-black text-white overflow-hidden">
          <div className="relative w-full">
            <Image
              src="/images/hero.jpg"
              alt="히어로 이미지"
              width={1920}
              height={1080}
              className="w-full h-auto object-contain"
              priority
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {/* 여기에 추가 콘텐츠를 넣을 수 있습니다 */}
            </div>
          </div>
        </section>

        {/* 카테고리 */}
        <section className="py-3 bg-white">
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

