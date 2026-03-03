'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/common/PromotionModalWrapper'
import { CATEGORIES } from '@/lib/utils/constants'
import { ProductFilter, ProductSortOrder } from '@/lib/product'
import { useInfiniteProducts } from '@/lib/product'
import {
  ProductsHeader,
  ProductsCategoryNav,
  ProductsGrid,
  ProductsEmpty,
  ProductsHero,
} from './_components'

export interface ProductsPageClientProps {
  initialCategory?: string | null
}

export default function ProductsPageClient(props: ProductsPageClientProps = {}) {
  const { initialCategory } = props
  const searchParams = useSearchParams()
  const router = useRouter()
  // initialCategory가 있으면 우선 사용, 없으면 URL searchParams에서 가져옴
  const category = initialCategory ?? searchParams.get('category')
  const searchQuery = searchParams.get('search')
  const filter = searchParams.get('filter') as ProductFilter | null
  const [selectedCategory, setSelectedCategory] = useState(category || '전체')
  const [sortOrder, setSortOrder] = useState<ProductSortOrder>('default')

  // URL 파라미터나 initialCategory가 변경되면 selectedCategory 업데이트
  useEffect(() => {
    setSelectedCategory(category || '전체')
  }, [category])

  // 상품 조회
  const {
    displayedProducts,
    loading,
    loadingMore,
    hasMore,
  } = useInfiniteProducts({
    category: selectedCategory !== '전체' ? selectedCategory : undefined,
    search: searchQuery || undefined,
    filter: filter || undefined,
    sort: sortOrder,
  })

  // 페이지 타이틀
  const pageTitle = useMemo(() => {
    if (searchQuery) return `"${searchQuery}" 검색 결과`
    if (filter === 'best') return '베스트'
    if (filter === 'sale') return '특가'
    if (selectedCategory && selectedCategory !== '전체') return selectedCategory
    return '전체 상품'
  }, [searchQuery, filter, selectedCategory])

  // 카테고리가 선택되었는지 확인
  const hasCategory = Boolean(selectedCategory && !searchQuery && !filter)

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <>
        <Header hideMainMenu={hasCategory} />
        <ProductsCategoryNav selectedCategory={selectedCategory} hasCategory={hasCategory} />
      </>

      <main className="flex-1">
        {/* 히어로 섹션 - 베스트/특가용 */}
        {filter && <ProductsHero filter={filter} />}

        {/* 일반 레이아웃 */}
          <div className="container mx-auto px-4 py-4 pt-6">
            {/* 페이지 제목 & 정렬 - 카테고리 선택 시 숨김 */}
            {!hasCategory && (
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-xl font-bold mb-1">
                    {pageTitle}
                  </h1>
                  {searchQuery && displayedProducts.length > 0 && (
                    <p className="text-gray-600 text-sm">
                      검색 결과
                    </p>
                  )}
                </div>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as ProductSortOrder)}
                  className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-800 focus:border-transparent transition"
                >
                  <option value="default">최신순</option>
                  <option value="price_asc">낮은 가격순</option>
                  <option value="price_desc">높은 가격순</option>
                </select>
              </div>
            )}
            
            {/* 카테고리 필터 - 데스크탑만 표시 */}
            {!searchQuery && !filter && !hasCategory && (
              <div className="hidden md:flex flex-wrap gap-2 mb-8">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      selectedCategory === cat
                        ? 'bg-primary-800 text-white shadow-md'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* 상품 그리드 */}
            {displayedProducts.length === 0 && !loading ? (
              <ProductsEmpty searchQuery={searchQuery} />
            ) : (
              <ProductsGrid products={displayedProducts} loading={loading} loadingMore={loadingMore} />
            )}
          </div>
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}

