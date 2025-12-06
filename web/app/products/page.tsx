'use client'

import { useEffect, useState, Suspense, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import TimeDealCountdown from '@/components/TimeDealCountdown'
import { Product } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { CATEGORIES, DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { getCategoryPath } from '@/lib/category-utils'
import { useCartStore } from '@/lib/store'

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const category = searchParams.get('category')
  const searchQuery = searchParams.get('search')
  const filter = searchParams.get('filter')
  const cartCount = useCartStore((state) => state.getTotalItems())
  
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(category || '전체')
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isFetchingRef = useRef(false) // 중복 호출 방지
  
  // 타임딜 정보
  const [timeDealTitle, setTimeDealTitle] = useState('오늘만 특가!')
  const [timeDealDescription, setTimeDealDescription] = useState<string | null>(null)
  const [timeDealEndTime, setTimeDealEndTime] = useState<string | null>(null)

  // URL 파라미터가 변경되면 selectedCategory 업데이트
  useEffect(() => {
    setSelectedCategory(category || '전체')
  }, [category])

  // 타임딜 정보 가져오기 (filter === 'flash-sale'일 때만)
  useEffect(() => {
    if (filter !== 'flash-sale') return

    const fetchTimeDealInfo = async () => {
      try {
        const response = await fetch('/api/collections/timedeal?limit=1')
        if (response.ok) {
          const data = await response.json()
          if (data.timedeal) {
            setTimeDealTitle(data.timedeal.title || data.title || '오늘만 특가!')
            setTimeDealDescription(data.timedeal.description || null)
            setTimeDealEndTime(data.timedeal.end_at || null)
          } else {
            setTimeDealTitle(data.title || '오늘만 특가!')
            setTimeDealDescription(null)
            setTimeDealEndTime(null)
          }
        }
      } catch (error) {
        console.error('타임딜 정보 조회 실패:', error)
        setTimeDealTitle('오늘만 특가!')
        setTimeDealDescription(null)
        setTimeDealEndTime(null)
      }
    }

    fetchTimeDealInfo()
    
    // 1분마다 갱신
    const interval = setInterval(fetchTimeDealInfo, 60000)
    return () => clearInterval(interval)
  }, [filter])

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
        limit: DEFAULT_PAGE_SIZE.toString(),
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

      // 타임아웃 설정 (10초)
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
        // 중복 방지: 이미 있는 상품은 제외하고 추가
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
        // 타임아웃 에러는 사용자에게 알림
        alert('상품 목록을 불러오는데 시간이 오래 걸립니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      isFetchingRef.current = false
    }
  }, [selectedCategory, searchQuery, filter])

  // 카테고리나 검색어가 변경되면 상품 조회 (초기 로드)
  useEffect(() => {
    setPage(1)
    setDisplayedProducts([])
    fetchProducts(1, sortOrder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery, filter])

  // 정렬 변경 시 처음부터 다시 로드
  useEffect(() => {
    setPage(1)
    setDisplayedProducts([])
    fetchProducts(1, sortOrder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder])

  // 더 보기 함수
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || isFetchingRef.current) return
    
    const nextPage = page + 1
    setPage(nextPage)
    fetchProducts(nextPage, sortOrder)
  }, [page, sortOrder, loadingMore, hasMore, fetchProducts])

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

  // 페이지 타이틀 메모이제이션 (타임딜일 때는 사용 안 함)
  const pageTitle = useMemo(() => {
    if (searchQuery) return `"${searchQuery}" 검색 결과`
    if (filter === 'best') return '베스트'
    if (filter === 'sale') return '특가'
    if (selectedCategory && selectedCategory !== '전체') return selectedCategory
    return '전체 상품'
  }, [searchQuery, filter, selectedCategory])

  // 카테고리가 선택되었는지 확인
  const hasCategory = Boolean(selectedCategory && !searchQuery && !filter)

  const handleCategoryNav = useCallback((cat: string) => {
    router.push(getCategoryPath(cat))
  }, [router])

  return (
    <div className="min-h-screen flex flex-col">
      {/* 타임딜일 때는 커스텀 헤더, 아니면 일반 Header */}
      {filter === 'flash-sale' ? (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            {/* 왼쪽: 뒤로가기 */}
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* 중앙: 제목 (absolute로 완전 중앙 배치) */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                타임딜
              </h1>
            </div>
            
            {/* 오른쪽: 장바구니 버튼 */}
            <div className="ml-auto flex items-center">
              <button
                onClick={() => router.push('/cart')}
                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                aria-label="장바구니"
              >
                <svg className="w-8 h-8 md:w-9 md:h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span
                  className={`absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
                    cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                  }`}
                  suppressHydrationWarning
                  aria-hidden={cartCount <= 0}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </button>
            </div>
          </div>
        </header>
      ) : (
        <>
          <Header hideMainMenu={hasCategory} />
          
          {/* 카테고리 메뉴 - MainMenu 대신 표시 */}
          {hasCategory && (
        <nav className="sticky top-0 z-50 shadow-sm bg-white">
          <div className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-start space-x-5 sm:space-x-7 md:space-x-14 pt-2 pb-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat
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
          )}
        </>
      )}
      
      <main className="flex-1">
        {/* 타임딜 콘텐츠 */}
        {filter === 'flash-sale' && (
          <div>
            {/* 타임딜 정보 섹션 */}
            <section className="pt-8 overflow-x-hidden" style={{ backgroundColor: '#EF4444' }}>
              <div className="container mx-auto px-2">
                <div className="mb-8">
                  <div className="flex flex-col gap-2 mb-3 w-[95%] mx-auto">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {/* 시계 이미지 */}
                        <div className="flex-shrink-0 relative -ml-1" style={{ width: '48px', height: '48px' }}>
                          <Image
                            src="/images/timedealclock.png"
                            alt="타임딜 시계"
                            fill
                            className="object-contain"
                            sizes="48px"
                          />
                        </div>
                        <h2 
                          className="font-extrabold text-[34px]" 
                          style={{ 
                            color: '#FFFFFF',
                            fontFamily: 'Pretendard, sans-serif',
                            fontWeight: 800,
                            letterSpacing: '-0.5px',
                            textShadow: '2px 2px 0px #000000, -2px -2px 0px #000000, 2px -2px 0px #000000, -2px 2px 0px #000000, 0px 2px 0px #000000, 2px 0px 0px #000000, 0px -2px 0px #000000, -2px 0px 0px #000000'
                          }}
                        >
                          {timeDealTitle}
                        </h2>
                      </div>
                    </div>
                  </div>
                  {timeDealEndTime && (
                    <div className="flex items-center ml-4">
                      <TimeDealCountdown endTime={timeDealEndTime} className="text-2xl" />
                    </div>
                  )}
                </div>
              </div>

              {/* 상품 그리드 - 흰색 배경으로 감싸기 */}
              <div className="bg-white pb-4 -mx-2 px-3 relative z-10">
                {timeDealDescription ? (
                  <div className="px-3 pt-4 mb-4">
                    <p 
                      className="text-xl"
                      style={{ 
                        color: '#000000',
                        fontFamily: 'Pretendard, sans-serif',
                        fontWeight: 700
                      }}
                    >
                      {timeDealDescription}
                    </p>
                  </div>
                ) : null}
                <div className="px-3 bg-white">

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
              </div>
              <div className="bg-white h-8 -mt-4"></div>
            </section>
          </div>
        )}

        {/* 히어로 섹션 - 베스트/특가용 */}
        {filter && filter !== 'flash-sale' && (
          <section className={`py-16 ${
            filter === 'best' ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white' :
            'bg-gradient-to-r from-red-600 to-red-600 text-white'
          }`}>
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                {filter === 'best' ? '👑 베스트' : '🔥 특가'}
              </h1>
              <p className={`text-sm tracking-widest ${
                filter === 'best' ? 'text-yellow-100' : 'text-red-100'
              }`}>
                {filter === 'best' ? 'BEST SELLERS' : 'HOT DEALS'}
              </p>
            </div>
          </section>
        )}

        {/* 타임딜이 아닐 때만 일반 레이아웃 표시 */}
        {filter !== 'flash-sale' && (
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
                  onChange={(e) => setSortOrder(e.target.value as 'default' | 'price_asc' | 'price_desc')}
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
        )}
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
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                상품
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
      <ProductsContent />
    </Suspense>
  )
}

