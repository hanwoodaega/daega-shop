import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { slugToCategory, isValidCategorySlug } from '@/lib/category/category-utils'
import ProductsPageClient from '../ProductsPageClient'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  
  // slug가 유효한 카테고리 slug인지 확인
  if (!isValidCategorySlug(slug)) {
    // 유효하지 않은 slug면 /products로 리다이렉트
    // (상품 상세 페이지일 수도 있지만, 여기서는 카테고리 페이지로만 처리)
    redirect('/products')
  }
  
  const category = slugToCategory(slug)
  
  // category가 없으면 /products로 리다이렉트
  if (!category) {
    redirect('/products')
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                {category}
              </h1>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-4 pt-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <ProductsPageClient initialCategory={category} />
    </Suspense>
  )
}

