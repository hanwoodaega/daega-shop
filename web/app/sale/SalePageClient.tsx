'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/common/PromotionModalWrapper'
import ProductCard from '@/components/product/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { Product } from '@/lib/supabase/supabase'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'

interface SalePageClientProps {
  initialProducts?: Product[]
  initialTotalPages?: number
}

export default function SalePageClient({ initialProducts, initialTotalPages }: SalePageClientProps) {
  const hasInitial = typeof initialProducts !== 'undefined'
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>(initialProducts ?? [])
  const [loading, setLoading] = useState(!hasInitial)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(hasInitial ? (initialTotalPages ?? 0) > 1 : true)
  const isFetchingRef = useRef(false)
  const initialUsedRef = useRef(hasInitial)

  const fetchCategoryProducts = useCallback(async (pageNum: number = 1, sort: 'default' | 'price_asc' | 'price_desc' = 'default') => {
    if (isFetchingRef.current) return
    
    isFetchingRef.current = true
    setLoading(pageNum === 1)
    setLoadingMore(pageNum > 1)
    
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: DEFAULT_PAGE_SIZE.toString(),
        sort: sort,
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`/api/categories/sale?${params.toString()}`, { 
        cache: 'no-store',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('카테고리 조회 실패')
      }

      const data = await response.json()
      
      if (pageNum === 1) {
        setDisplayedProducts(data.products || [])
      } else {
        setDisplayedProducts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id))
          const newProducts = (data.products || []).filter((p: any) => !existingIds.has(p.id))
          return [...prev, ...newProducts]
        })
      }
      
      // 다음 페이지가 있는지 확인
      setHasMore(pageNum < data.pagination.totalPages && (data.products || []).length > 0)
    } catch (error: any) {
      console.error('카테고리 상품 조회 실패:', error)
      if (error.name === 'AbortError') {
        alert('상품을 불러오는데 시간이 오래 걸립니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      isFetchingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (initialUsedRef.current && sortOrder === 'default') {
      setPage(1)
      setHasMore((initialTotalPages ?? 0) > 1)
      setLoading(false)
      initialUsedRef.current = false
      return
    }

    setPage(1)
    setDisplayedProducts([])
    fetchCategoryProducts(1, sortOrder)
  }, [sortOrder, fetchCategoryProducts, initialTotalPages])

  useEffect(() => {
    if (page > 1) {
      fetchCategoryProducts(page, sortOrder)
    }
  }, [page, sortOrder, fetchCategoryProducts])

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return
      
      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const clientHeight = document.documentElement.clientHeight
      
      if (scrollTop + clientHeight >= scrollHeight - 500) {
        handleLoadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMore, hasMore])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 pt-4 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h1 
              className="text-2xl md:text-3xl font-semibold"
              style={{ 
                color: '#000000',
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 600,
                letterSpacing: '-0.5px',
              }}
            >
              특가 상품
            </h1>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as 'default' | 'price_asc' | 'price_desc')
                setPage(1)
                setDisplayedProducts([])
              }}
              className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-800 focus:border-transparent transition"
            >
              <option value="default">최신순</option>
              <option value="price_asc">낮은 가격순</option>
              <option value="price_desc">높은 가격순</option>
            </select>
          </div>

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
                할인 중인 상품이 없습니다
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
