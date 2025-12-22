'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Product } from '@/lib/supabase/supabase'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'
import { slugToCategory } from '@/lib/category/category-utils'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { CATEGORIES } from '@/lib/utils/constants'
import { getCategoryPath } from '@/lib/category/category-utils'

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const category = slugToCategory(slug)
  
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isFetchingRef = useRef(false)

  // category 값이 없으면 리다이렉트 (상품 상세 페이지일 수도 있으므로 확인 필요)
  useEffect(() => {
    if (!category || !slug) {
      // slug가 카테고리가 아니면 상품 상세 페이지로 이동 시도
      // 여기서는 카테고리가 아닌 경우 /products로 리다이렉트
      router.push('/products')
    }
  }, [category, slug, router])

  const fetchProducts = useCallback(async (pageNum: number = 1, sort: 'default' | 'price_asc' | 'price_desc' = 'default') => {
    if (!category || isFetchingRef.current) return
    
    isFetchingRef.current = true
    setLoading(pageNum === 1)
    setLoadingMore(pageNum > 1)
    
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: DEFAULT_PAGE_SIZE.toString(),
        sort: sort === 'default' ? 'default' : sort,
        category: category,
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`/api/products?${params.toString()}`, { 
        cache: 'no-store',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('상품 조회 실패')
      }

      const data = await response.json()
      const products = data.products || []

      if (pageNum === 1) {
        setDisplayedProducts(products)
      } else {
        setDisplayedProducts(prev => {
          const existingIds = new Set(prev.map((p: Product) => p.id))
          const newProducts = products.filter((p: Product) => !existingIds.has(p.id))
          return [...prev, ...newProducts]
        })
      }
      
      setHasMore(pageNum < data.totalPages)
    } catch (error: any) {
      console.error('상품 조회 실패:', error)
      if (error.name === 'AbortError') {
        alert('상품 목록을 불러오는데 시간이 오래 걸립니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      isFetchingRef.current = false
    }
  }, [category])

  // 카테고리나 slug가 변경되면 상품 조회
  useEffect(() => {
    if (!category) return
    setPage(1)
    setDisplayedProducts([])
    fetchProducts(1, sortOrder)
  }, [category, slug, fetchProducts, sortOrder])

  // 정렬 변경 시 처음부터 다시 로드
  useEffect(() => {
    if (!category) return
    setPage(1)
    setDisplayedProducts([])
    fetchProducts(1, sortOrder)
  }, [sortOrder, category, fetchProducts])

  // 더 보기 함수
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || isFetchingRef.current || !category) return
    
    const nextPage = page + 1
    setPage(nextPage)
    fetchProducts(nextPage, sortOrder)
  }, [page, sortOrder, loadingMore, hasMore, fetchProducts, category])

  // 무한 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  // 카테고리가 아니면 null 반환 (상품 상세 페이지로 라우팅될 수 있음)
  if (!category) {
    return null
  }

  const handleCategoryNav = (cat: string) => {
    if (cat === '전체') {
      router.push('/products')
    } else {
      router.push(getCategoryPath(cat))
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header hideMainMenu={true} />
      
      {/* 카테고리 탭 */}
      <nav className="sticky top-0 z-50 shadow-sm bg-white">
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-start space-x-5 sm:space-x-7 md:space-x-14 pt-2 pb-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
              {CATEGORIES.map((cat) => {
                const isActive = category === cat
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryNav(cat)}
                    className={`font-medium text-base sm:text-lg md:text-xl transition relative group pb-1.5 whitespace-nowrap flex-shrink-0 ${
                      isActive ? 'text-red-600' : 'text-gray-700 hover:text-primary-800'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`absolute -bottom-0.5 h-0.5 transition-all ${
                        isActive
                          ? 'bg-red-600 left-[-8px] right-[-8px]'
                          : 'w-0 left-0 right-0 bg-primary-800 group-hover:w-full'
                      }`}
                    ></span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-4 pt-6">
          {/* 페이지 제목 & 정렬 */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl font-bold mb-1">
                {category}
              </h1>
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

          {/* 상품 그리드 */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl text-gray-600 mb-2">
                등록된 상품이 없습니다
              </p>
              <Link href="/products">
                <button className="mt-4 px-6 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition">
                  전체 상품 보기
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800"></div>
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

