import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import CategoryGrid from '@/components/CategoryGrid'
import CollectionSectionContainer from './(home)/_components/CollectionSectionContainer'
import RecommendationSection from '@/components/RecommendationSection'
import TimeDealSection from '@/components/timedeal/TimeDealSection'
import HeroSlider from '@/components/HeroSlider'
import BannerSectionContainer from './(home)/_components/BannerSectionContainer'

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

export default async function Home() {
  let collections: Collection[] = []

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    const res = await fetch(`${siteUrl}/api/collections`, {
      next: { revalidate: 300 }, // 5분 캐시
    })
    
    if (res.ok) {
      const data = await res.json()
      collections = data.collections || []
    }
  } catch (error: any) {
    // 빌드 시점 연결 실패는 무시 (정상적인 동작)
    // ECONNREFUSED 에러는 조용히 무시
    const isConnectionRefused = 
      error?.code === 'ECONNREFUSED' || 
      error?.cause?.code === 'ECONNREFUSED' ||
      error?.errno === -111 ||
      error?.cause?.errno === -111
    
    if (!isConnectionRefused) {
      console.error('컬렉션 조회 실패:', error)
    }
    // 에러 시 빈 배열로 fallback
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroSlider />

        <section className="py-8 bg-white">
          <div className="container mx-auto px-4">
            <CategoryGrid selectedCategory="" />
          </div>
        </section>

        <TimeDealSection />

        {collections.length > 0 &&
          collections.map((collection) => (
            <CollectionSectionContainer key={collection.id} collection={collection} />
          ))
        }

        <div className="mt-20 mb-20">
          <BannerSectionContainer />
        </div>

        <RecommendationSection />
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}

