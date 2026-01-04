import { Suspense } from 'react'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import BannerHeader from './_components/BannerHeader'
import BannerPageClient from './BannerPageClient'

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
      <BannerPageClient slug={params.slug} />
    </Suspense>
  )
}

