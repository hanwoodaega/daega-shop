'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import CategoryGrid from '@/components/CategoryGrid'
import CollectionSection from '@/components/CollectionSection'
import RecommendationSection from '@/components/RecommendationSection'
import TimeDealSection from '@/components/TimeDealSection'
import HeroSlider from '@/components/HeroSlider'
import BannerSection from '@/components/BannerSection'

interface ColorTheme {
  background?: string
  accent?: string
  title_color?: string
  description_color?: string
  button_color?: string
  button_text_color?: string
}

interface Collection {
  id: string
  type: string
  title?: string | null
  description?: string | null
  image_url?: string | null
  color_theme?: ColorTheme | null
  sort_order?: number
  is_active?: boolean
}

export default function Home() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch('/api/collections/main')
        const data = await res.json()
        if (res.ok) {
          setCollections(data.collections || [])
        }
      } catch (error) {
        console.error('컬렉션 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCollections()
  }, [])


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* 히어로 섹션 */}
        <HeroSlider />

        {/* 카테고리 */}
        <section className="py-8 bg-white">
          <div className="container mx-auto px-4">
            <CategoryGrid selectedCategory="" />
          </div>
        </section>

        {/* 타임딜 섹션 */}
        <TimeDealSection />

        {/* 컬렉션 섹션들 */}
        {collections.map((collection) => {
          return <CollectionSection key={collection.id} collection={collection} />
        })}

        {/* 배너 섹션 */}
        <div className="mt-20 mb-20">
          <BannerSection />
        </div>

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

