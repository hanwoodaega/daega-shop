'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { supabase, Product, isSupabaseConfigured } from '@/lib/supabase'
import CategoryGrid from '@/components/CategoryGrid'

export default function Home() {
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 20

  const fetchProducts = useCallback(async (pageNum: number = 1, sort: 'default' | 'price_asc' | 'price_desc' = 'default') => {
    try {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      const from = (pageNum - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .range(from, to)
      
      // 정렬 적용
      if (sort === 'price_asc') {
        query = query.order('price', { ascending: true })
      } else if (sort === 'price_desc') {
        query = query.order('price', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }
      
      const { data, error, count } = await query
      
      if (error) throw error

      if (pageNum === 1) {
        setDisplayedProducts(data || [])
      } else {
        // 중복 방지: 이미 있는 상품은 제외하고 추가
        setDisplayedProducts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id))
          const newProducts = (data || []).filter((p: any) => !existingIds.has(p.id))
          return [...prev, ...newProducts]
        })
      }
      
      setHasMore((count || 0) > pageNum * PAGE_SIZE)
    } catch (error) {
      console.error('상품 조회 실패:', error)
      setErrorMessage('상품 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
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
        <section className="bg-gradient-to-r from-red-600 to-red-700 text-white py-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-4">
              대가 정육백화점
            </h1>
            <p className="text-sm tracking-widest text-gray-300">
              DAEGA PREMIUM MEAT
            </p>
          </div>
        </section>

        {/* 카테고리 - 모바일만 표시 */}
        <section className="py-3 bg-gray-100 md:hidden">
          <div className="container mx-auto px-4">
            <CategoryGrid selectedCategory="" />
          </div>
        </section>

        {/* 전체 상품 */}
        <section className="pt-6 pb-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-primary-900">상품 목록</h2>
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
    </div>
  )
}

