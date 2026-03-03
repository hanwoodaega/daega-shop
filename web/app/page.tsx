import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/common/PromotionModalWrapper'
import CategoryGrid from '@/components/sections/CategoryGrid'
import WeeklyDiscountSection from '@/components/sections/WeeklyDiscountSection'
import CollectionSectionUI from '@/components/collection/CollectionSectionUI'
import RecommendationSection from '@/components/sections/RecommendationSection'
import HeroSlider from '@/components/sections/HeroSlider'
import BannerSection from '@/components/banner/BannerSection'
import { getServerBaseUrl } from '@/lib/utils/server-url'

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

interface HeroSlide {
  id: string
  image_url: string
  link_url: string | null
  sort_order: number
}

interface RecommendationCategory {
  id: string
  name: string
  sort_order: number
  is_active: boolean
}

export default async function Home() {
  let collections: Collection[] = []
  let heroSlides: HeroSlide[] = []
  let weeklyCollection: Collection | null = null
  let weeklyProducts: any[] = []
  let collectionSections: Array<{ collection: Collection; products: any[] }> = []
  let recommendationCategories: RecommendationCategory[] = []
  let recommendationProducts: any[] | undefined = undefined
  let recommendationCategoryId: string | null = null

  try {
    const siteUrl = await getServerBaseUrl()

    if (siteUrl) {
      const [collectionsRes, heroRes, recommendationRes] = await Promise.all([
        fetch(`${siteUrl}/api/collections`, {
          next: { revalidate: 300 }, // 5분 캐시
        }),
        fetch(`${siteUrl}/api/hero`, {
          next: { revalidate: 300 }, // 5분 캐시
        }),
        fetch(`${siteUrl}/api/recommendations`, {
          next: { revalidate: 300 }, // 5분 캐시
        }),
      ])

      if (collectionsRes.ok) {
        const data = await collectionsRes.json()
        collections = data.collections || []
      }

      if (heroRes.ok) {
        const data = await heroRes.json()
        heroSlides = data.slides || []
      }

      if (recommendationRes.ok) {
        const data = await recommendationRes.json()
        recommendationCategories = data.categories || []
        recommendationCategoryId = recommendationCategories[0]?.id ?? null
      }

      if (recommendationCategoryId) {
        const recProductsRes = await fetch(
          `${siteUrl}/api/recommendations/${recommendationCategoryId}/products`,
          { next: { revalidate: 300 } }
        )
        if (recProductsRes.ok) {
          const data = await recProductsRes.json()
          recommendationProducts = data.products || []
        }
      }

      weeklyCollection = collections.find(
        (collection) => collection.type?.toLowerCase() === 'weekly_discount'
      ) || null

      if (weeklyCollection) {
        const weeklyRes = await fetch(`${siteUrl}/api/collections/weekly_discount?limit=4`, {
          next: { revalidate: 300 },
        })
        if (weeklyRes.ok) {
          const data = await weeklyRes.json()
          weeklyProducts = data.products || []
        }
      }

      const nonWeeklyCollections = collections.filter(
        (collection) => collection.type?.toLowerCase() !== 'weekly_discount'
      )

      if (nonWeeklyCollections.length > 0) {
        const sectionResults = await Promise.all(
          nonWeeklyCollections.map(async (collection) => {
            const res = await fetch(`${siteUrl}/api/collections/${collection.type}?limit=4`, {
              next: { revalidate: 300 },
            })

            if (!res.ok) {
              return { collection, products: [] }
            }

            const data = await res.json()
            return {
              collection,
              products: data.products || [],
            }
          })
        )

        collectionSections = sectionResults
      }
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
        {/* PC(lg)에서만 히어로 슬라이더가 화면 가득, 나머지 콘텐츠는 1050px 컨테이너 안 */}
        <div className="lg:relative lg:left-1/2 lg:right-1/2 lg:-ml-[50vw] lg:-mr-[50vw] lg:w-screen">
          <HeroSlider initialSlides={heroSlides} />
        </div>

        <section className="py-8 bg-white">
          <div className="container mx-auto px-4">
            <CategoryGrid selectedCategory="" />
          </div>
        </section>

        <WeeklyDiscountSection collection={weeklyCollection} products={weeklyProducts} />

        {collectionSections.length > 0 &&
          collectionSections
            .filter((section) => section.products.length > 0)
            .map((section) => (
              <CollectionSectionUI
                key={section.collection.id}
                collection={section.collection}
                products={section.products}
                loading={false}
              />
            ))}

        <div className="mt-20 mb-20">
          <BannerSection />
        </div>

        <RecommendationSection
          initialCategories={recommendationCategories}
          initialProducts={recommendationProducts}
          initialSelectedCategoryId={recommendationCategoryId}
          initialProductsCategoryId={recommendationCategoryId}
        />
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}

