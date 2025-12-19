'use client'

import { useEffect, useState, Suspense, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { Product } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { useCartStore } from '@/lib/store'
import { throttle } from '@/lib/utils'

function BannerContent({ slug }: { slug: string }) {
  const router = useRouter()
  const bannerSlug = slug
  const cartCount = useCartStore((state) => state.getTotalItems())
  
  const [banner, setBanner] = useState<any>(null)
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isFetchingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0) // Race Condition 방지용

  const fetchBanner = useCallback(async (pageNum: number = 1) => {
    // 중복 요청 방지 (초기 빠른 연속 호출 방지)
    if (isFetchingRef.current) return
    
    // 이전 요청이 있으면 abort
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 새로운 요청 ID 생성 (Race Condition 방지)
    const requestId = ++requestIdRef.current
    
    isFetchingRef.current = true
    setLoading(pageNum === 1)
    setLoadingMore(pageNum > 1)
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    let timeoutId: NodeJS.Timeout | null = null
    
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: DEFAULT_PAGE_SIZE.toString(),
        sort: 'default',
      })

      timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`/api/banners/${bannerSlug}?${params.toString()}`, { 
        cache: 'no-store',
        signal: controller.signal
      })

      // 요청 완료 시 timeout 정리
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      // Race Condition 체크: 이 요청이 더 이상 최신 요청이 아니면 무시
      if (requestId !== requestIdRef.current) {
        return // 오래된 요청 응답 → 무시
      }

      if (!response.ok) {
        // 404 에러인 경우 (배너 없음) - toast 없이 자연스럽게 처리
        if (response.status === 404) {
          if (requestId === requestIdRef.current) {
            setBanner(null)
            setDisplayedProducts([])
            setLoading(false)
            setLoadingMore(false)
            isFetchingRef.current = false
          }
          return
        }
        throw new Error('배너 조회 실패')
      }

      const data = await response.json()
      
      // 응답 처리 전 다시 한 번 체크 (데이터 처리 중에 새 요청이 올 수 있음)
      if (requestId !== requestIdRef.current) {
        return // 오래된 요청 응답 → 무시
      }
      
      if (pageNum === 1) {
        setBanner(data.banner)
        setDisplayedProducts(data.products || [])
      } else {
        setDisplayedProducts(prev => {
          const seen = new Set(prev.map((p: any) => p.id))
          const result = [...prev] // 기존 배열 복사
          for (const p of data.products || []) {
            if (!seen.has(p.id)) {
              result.push(p)
              seen.add(p.id) // 다음 중복 체크를 위해 추가
            }
          }
          return result
        })
      }
      
      setHasMore(pageNum < data.totalPages)
    } catch (error: any) {
      // AbortError는 정상적인 취소 (페이지 이동 등)이므로 무시
      if (error.name === 'AbortError') {
        // 최신 요청이 abort된 경우에만 로딩 상태 해제
        if (requestId === requestIdRef.current) {
          isFetchingRef.current = false
          setLoading(false)
          setLoadingMore(false)
        }
        return // AbortError는 조용히 반환
      }
      
      // 사용자에게 에러 알림 (최신 요청일 때만)
      if (requestId === requestIdRef.current) {
        toast.error('배너를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      // timeout 정리 보장
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      // 현재 요청이 마지막 요청인 경우에만 ref 초기화
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      
      // 이 요청이 최신 요청일 때만 로딩 상태 해제
      if (requestId === requestIdRef.current) {
        isFetchingRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [bannerSlug])

  useEffect(() => {
    if (bannerSlug) {
      setPage(1)
      setDisplayedProducts([])
      fetchBanner(1)
    }
    
    // cleanup: 컴포넌트 언마운트나 의존성 변경 시 이전 요청 취소
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      isFetchingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerSlug])

  useEffect(() => {
    if (page > 1) {
      fetchBanner(page)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1)
    }
  }, [loadingMore, hasMore])

  useEffect(() => {
    const handleScroll = throttle(() => {
      if (loadingMore || !hasMore) return
      
      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const clientHeight = document.documentElement.clientHeight
      
      if (scrollTop + clientHeight >= scrollHeight - 500) {
        handleLoadMore()
      }
    }, 300) // 300ms마다 최대 한 번만 실행

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMore, hasMore, handleLoadMore])

  const bannerTitle = banner?.title || '배너'

  if (!banner && !loading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* 배너 전용 헤더 */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                배너
              </h1>
            </div>
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
      {/* 배너 전용 헤더 */}
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
              {bannerTitle}
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
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-4 pt-6">
          {/* 배너 정보 영역 (텍스트만 표시) */}
          {banner && (
            <div className="mb-6">
              <div className="mb-3">
                {banner.subtitle_black && (
                  <h2 className="text-2xl md:text-3xl font-bold text-black mb-1 whitespace-pre-line tracking-tight leading-tight">
                    {banner.subtitle_black}
                  </h2>
                )}
                {banner.subtitle_red && (
                  <h2 className="text-2xl md:text-3xl font-bold text-red-600 mb-0 whitespace-pre-line tracking-tight leading-tight">
                    {banner.subtitle_red}
                  </h2>
                )}
              </div>
              {banner.description && (
                <p className="text-sm md:text-base text-gray-600 whitespace-pre-line leading-relaxed">
                  {banner.description}
                </p>
              )}
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
                등록된 상품이 없습니다
              </p>
              <Link href="/products">
                <button className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-600 transition">
                  전체 상품 보기
                </button>
              </Link>
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

export default function BannerPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                배너
              </h1>
            </div>
          </div>
        </header>
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

