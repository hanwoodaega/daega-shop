'use client'

import { useEffect, useState, Suspense, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { Product } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import CategoryGrid from '@/components/CategoryGrid'
import { CATEGORIES } from '@/lib/constants'

function ProductsContent() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category')
  const searchQuery = searchParams.get('search')
  const filter = searchParams.get('filter')
  
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(category || '전체')
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isFetchingRef = useRef(false) // 중복 호출 방지
  const PAGE_SIZE = 20

  // URL 파라미터가 변경되면 selectedCategory 업데이트
  useEffect(() => {
    setSelectedCategory(category || '전체')
  }, [category])

  const fetchProducts = useCallback(async (pageNum: number = 1, sort: 'default' | 'price_asc' | 'price_desc' = 'default') => {
    // 중복 호출 방지
    if (isFetchingRef.current) return
    
    isFetchingRef.current = true
    setLoading(pageNum === 1)
    setLoadingMore(pageNum > 1)
    
    try {
      // 새로운 API 사용: 상품 목록과 리뷰 통계를 한 번에 가져오기
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: PAGE_SIZE.toString(),
        sort: sort === 'default' ? 'default' : sort,
      })

      // 검색어, 필터, 카테고리 파라미터 추가
      if (searchQuery) {
        params.append('search', searchQuery)
      } else if (filter) {
        params.append('filter', filter)
      } else if (selectedCategory && selectedCategory !== '전체') {
        params.append('category', selectedCategory)
      }

      const response = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' })

      if (!response.ok) {
        throw new Error('상품 조회 실패')
      }

      const data = await response.json()
      const enriched = data.products || []

      if (pageNum === 1) {
        setDisplayedProducts(enriched || [])
      } else {
        // 중복 방지: 이미 있는 상품은 제외하고 추가
        setDisplayedProducts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id))
          const newProducts = (enriched || []).filter((p: any) => !existingIds.has(p.id))
          return [...prev, ...newProducts]
        })
      }
      
      setHasMore(pageNum < data.totalPages)
    } catch (error) {
      console.error('상품 조회 실패:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      isFetchingRef.current = false
    }
  }, [selectedCategory, searchQuery, filter])

  // 카테고리나 검색어가 변경되면 상품 조회 (초기 로드)
  useEffect(() => {
    setPage(1)
    setDisplayedProducts([]) // 기존 데이터 클리어
    fetchProducts(1, sortOrder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery, filter]) // sortOrder는 별도 처리

  // 더 보기 함수
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage) // 페이지 먼저 업데이트 (중복 호출 방지)
    
    fetchProducts(nextPage, sortOrder).finally(() => {
      setLoadingMore(false)
    })
  }, [page, sortOrder, loadingMore, hasMore, fetchProducts])

  // 정렬 변경 시 처음부터 다시 로드
  useEffect(() => {
    setPage(1)
    setDisplayedProducts([]) // 기존 데이터 클리어
    fetchProducts(1, sortOrder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]) // fetchProducts 의존성 제거 (중복 호출 방지)

  // 무한 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      // 페이지 맨 아래에서 300px 전에 로드 시작
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  // 페이지 타이틀 메모이제이션
  const pageTitle = useMemo(() => {
    if (searchQuery) return `"${searchQuery}" 검색 결과`
    if (filter === 'new') return '신상품'
    if (filter === 'best') return '베스트'
    if (filter === 'sale') return '전단행사'
    if (filter === 'budget') return '알뜰상품'
    if (selectedCategory && selectedCategory !== '전체') return selectedCategory
    return '전체 상품'
  }, [searchQuery, filter, selectedCategory])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* 히어로 섹션 - 신상품 */}
        {filter === 'new' && (
          <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                ✨ 신상품
              </h1>
              <p className="text-sm tracking-widest text-green-100">
                NEW ARRIVALS
              </p>
            </div>
          </section>
        )}

        {/* 히어로 섹션 - 베스트 */}
        {filter === 'best' && (
          <section className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                👑 베스트
              </h1>
              <p className="text-sm tracking-widest text-yellow-100">
                BEST SELLERS
              </p>
            </div>
          </section>
        )}

        {/* 히어로 섹션 - 전단행사 */}
        {filter === 'sale' && (
          <section className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                🔥 전단행사
              </h1>
              <p className="text-sm tracking-widest text-red-100">
                HOT DEALS
              </p>
            </div>
          </section>
        )}

        {/* 히어로 섹션 - 알뜰상품 */}
        {filter === 'budget' && (
          <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                💰 알뜰상품
              </h1>
              <p className="text-sm tracking-widest text-blue-100">
                BUDGET FRIENDLY
              </p>
            </div>
          </section>
        )}

        {/* 카테고리 - 모바일만 표시 */}
        {!searchQuery && !filter && (
          <section className="py-3 bg-gray-100 md:hidden">
            <div className="container mx-auto px-4">
              <CategoryGrid selectedCategory={selectedCategory} />
            </div>
          </section>
        )}
      
        <div className="container mx-auto px-4 py-4 pt-6">
        {/* 페이지 제목 & 정렬 */}
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
            onChange={(e) => setSortOrder(e.target.value as 'default' | 'price_asc' | 'price_desc')}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-800 focus:border-transparent transition"
          >
            <option value="default">최신순</option>
            <option value="price_asc">낮은 가격순</option>
            <option value="price_desc">높은 가격순</option>
          </select>
        </div>
        
        {/* 카테고리 필터 - 데스크탑만 표시 */}
        {!searchQuery && !filter && (
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
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-600 mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '등록된 상품이 없습니다'}
            </p>
            {searchQuery && (
              <Link href="/products">
                <button className="mt-4 px-6 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition">
                  전체 상품 보기
                </button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {/* 무한 스크롤 로딩 */}
            {loadingMore && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800"></div>
              </div>
            )}
            
            {/* 모든 상품 로드 완료 */}
            {!hasMore && displayedProducts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">모든 상품을 확인하셨습니다 ✨</p>
              </div>
            )}
          </>
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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
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
      <ProductsContent />
    </Suspense>
  )
}

