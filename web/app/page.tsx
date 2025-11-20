'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { Product } from '@/lib/supabase'
import CategoryGrid from '@/components/CategoryGrid'
import FlashSaleSection from '@/components/FlashSaleSection'
import RecentlyViewedSection from '@/components/RecentlyViewedSection'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

export default function Home() {
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showSortModal, setShowSortModal] = useState(false)
  const [totalProductCount, setTotalProductCount] = useState<number>(0)
  const isFetchingRef = useRef(false) // 중복 호출 방지 (useRef 사용)

  const fetchProducts = useCallback(async (pageNum: number = 1, sort: 'default' | 'price_asc' | 'price_desc' = 'default') => {
    // 중복 호출 방지
    if (isFetchingRef.current) return
    
    isFetchingRef.current = true
    try {
      // 새로운 API 사용: 상품 목록과 리뷰 통계를 한 번에 가져오기
      const sortParam = sort === 'default' ? 'default' : sort
      
      // 타임아웃 설정 (10초)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch(
        `/api/products?page=${pageNum}&limit=${DEFAULT_PAGE_SIZE}&sort=${sortParam}`,
        { 
          cache: 'no-store',
          signal: controller.signal
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('상품 조회 실패')
      }

      const data = await response.json()
      const enriched = data.products || []

      if (pageNum === 1) {
        setDisplayedProducts(enriched)
        setTotalProductCount(data.total || 0)
      } else {
        // 중복 방지: 이미 있는 상품은 제외하고 추가
        setDisplayedProducts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id))
          const newProducts = enriched.filter((p: any) => !existingIds.has(p.id))
          return [...prev, ...newProducts]
        })
      }
      
      setHasMore(pageNum < data.totalPages)
    } catch (error: any) {
      console.error('상품 조회 실패:', error)
      if (error.name === 'AbortError') {
        setErrorMessage('상품 목록을 불러오는데 시간이 오래 걸립니다. 잠시 후 다시 시도해주세요.')
      } else {
        setErrorMessage('상품 목록을 불러오지 못했습니다.')
      }
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  // 초기 로드 & 정렬 변경 통합 (중복 호출 방지)
  useEffect(() => {
    setLoading(true)
    setPage(1)
    setDisplayedProducts([]) // 기존 데이터 클리어
    fetchProducts(1, sortOrder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]) // sortOrder 변경 시 (초기 로드 포함)

  // 안전장치: 8초 안에 로딩이 끝나지 않으면 에러 메시지
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => {
      if (loading) {
        setErrorMessage('상품 목록을 불러오는데 시간이 오래 걸립니다. 잠시 후 다시 시도해주세요.')
        setLoading(false)
      }
    }, 8000)
    return () => clearTimeout(timer)
  }, [loading])

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* 히어로 섹션 */}
        <section className="bg-black text-white py-32 md:py-40 lg:py-48">
          <div className="container mx-auto px-4 text-center">
          </div>
        </section>

        {/* 카테고리 - 모바일만 표시 */}
        <section className="py-3 bg-white md:hidden">
          <div className="container mx-auto px-4">
            <CategoryGrid selectedCategory="" />
          </div>
        </section>

        {/* 타임딜/플래시 세일 섹션 */}
        <FlashSaleSection />

        {/* 최근 본 상품 */}
        <RecentlyViewedSection />

        {/* 전체 상품 */}
        <section className="pt-6 pb-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                {!loading && totalProductCount > 0 && (
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-gray-900">{totalProductCount}</span>개의 상품이 있습니다
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowSortModal(true)}
                className="px-3 py-1.5 text-xs text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                {sortOrder === 'default' ? '최신순' : sortOrder === 'price_asc' ? '낮은 가격순' : '높은 가격순'} ▼
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
                {[...Array(6)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : errorMessage ? (
              <div className="text-center py-20">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600">등록된 상품이 없습니다.</p>
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
        </section>
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />

      {/* 정렬 모달 (하단에서 올라오는) */}
      {showSortModal && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowSortModal(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl animate-slide-up">
            <div className="px-4 pt-4 pb-6">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h3 className="text-sm font-bold text-center mb-3">정렬 기준</h3>
              <div className="border-b border-gray-200 mb-4" />
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSortOrder('default')
                    setShowSortModal(false)
                  }}
                  className="w-full py-3 px-4 flex items-center gap-3 text-left rounded-lg transition hover:bg-gray-50"
                >
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      sortOrder === 'default'
                        ? 'border-primary-800'
                        : 'border-gray-300'
                    }`}>
                      {sortOrder === 'default' && (
                        <div className="w-3 h-3 rounded-full bg-primary-800" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700">최신순</span>
                </button>
                <button
                  onClick={() => {
                    setSortOrder('price_asc')
                    setShowSortModal(false)
                  }}
                  className="w-full py-3 px-4 flex items-center gap-3 text-left rounded-lg transition hover:bg-gray-50"
                >
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      sortOrder === 'price_asc'
                        ? 'border-primary-800'
                        : 'border-gray-300'
                    }`}>
                      {sortOrder === 'price_asc' && (
                        <div className="w-3 h-3 rounded-full bg-primary-800" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700">낮은 가격순</span>
                </button>
                <button
                  onClick={() => {
                    setSortOrder('price_desc')
                    setShowSortModal(false)
                  }}
                  className="w-full py-3 px-4 flex items-center gap-3 text-left rounded-lg transition hover:bg-gray-50"
                >
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      sortOrder === 'price_desc'
                        ? 'border-primary-800'
                        : 'border-gray-300'
                    }`}>
                      {sortOrder === 'price_desc' && (
                        <div className="w-3 h-3 rounded-full bg-primary-800" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700">높은 가격순</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

