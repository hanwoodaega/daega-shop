'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ProductCard from '@/components/ProductCard'
import { supabase, Product, isSupabaseConfigured } from '@/lib/supabase'
import CategoryGrid from '@/components/CategoryGrid'

export default function Home() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')

  const fetchProducts = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8)
      
      if (error) throw error
      setAllProducts(data || [])
    } catch (error) {
      console.error('상품 조회 실패:', error)
      setErrorMessage('상품 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // 안전장치: 8초 안에 로딩이 끝나지 않으면 에러 메시지와 함께 로딩 종료
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

  const handleScroll = useCallback(() => {
    if (window.scrollY > 300) {
      setShowScrollTop(true)
    } else {
      setShowScrollTop(false)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, [])

  // 정렬된 상품 목록을 useMemo로 메모이제이션
  const products = useMemo(() => {
    if (sortOrder === 'default') {
      return allProducts
    }
    return [...allProducts].sort((a, b) =>
      sortOrder === 'price_asc' ? a.price - b.price : b.price - a.price
    )
  }, [sortOrder, allProducts])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* 히어로 섹션 */}
        <section className="bg-gradient-to-r from-primary-800 to-primary-900 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-4">
              대가 정육백화점
            </h1>
            <p className="text-sm tracking-widest text-gray-300 mb-8">
              DAEGA PREMIUM MEAT
            </p>
            <Link href="/products">
              <button className="bg-white text-primary-900 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition shadow-lg">
                상품 둘러보기
              </button>
            </Link>
          </div>
        </section>

        {/* 카테고리 - 모바일만 표시 */}
        <section className="py-4 bg-white md:hidden border-b-2 border-gray-300">
          <div className="container mx-auto px-4">
            <CategoryGrid selectedCategory="" />
          </div>
        </section>

        {/* 전체 상품 */}
        <section className="pt-8 pb-16 bg-gray-50">
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
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
              </div>
            ) : errorMessage ? (
              <div className="text-center py-20">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600">등록된 상품이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 위로가기 버튼 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-8 bg-white/60 backdrop-blur-sm text-primary-800 p-4 rounded-full shadow-lg hover:bg-white/75 transition-all duration-300 z-50 hover:scale-110"
          aria-label="위로가기"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          </svg>
        </button>
      )}

      <Footer />
      <BottomNavbar />
    </div>
  )
}

