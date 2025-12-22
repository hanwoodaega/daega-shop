'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { BannerHeader } from '@/components/banners/BannerHeader'
import { BannerDescription } from '@/components/banners/BannerDescription'
import { BannerProductGrid } from '@/components/banners/BannerProductGrid'
import { useBannerProducts } from '@/lib/banner/useBannerProducts'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'

function BannerContent({ slug }: { slug: string }) {
  const { banner, products, loading, loadingMore } = useBannerProducts(slug)

  const bannerTitle = banner?.title || '배너'

  if (!banner && !loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <BannerHeader title="배너" />
        <main className="flex-1 container mx-auto px-4 py-20 text-center">
          <p className="text-xl text-gray-600 mb-4">배너를 찾을 수 없습니다</p>
          <Link href="/">
            <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-600">
              홈으로 가기
            </button>
          </Link>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BannerHeader title={bannerTitle} />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-4 pt-6">
          {banner && (
            <BannerDescription
              subtitle_black={banner.subtitle_black}
              subtitle_red={banner.subtitle_red}
              description={banner.description}
            />
          )}

          <BannerProductGrid
            products={products}
            loading={loading}
            loadingMore={loadingMore}
          />
        </div>
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}

export default function BannerPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <BannerHeader title="배너" />
        <main className="flex-1 container mx-auto px-4 py-4 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <BannerContent slug={params.slug} />
    </Suspense>
  )
}  

