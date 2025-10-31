'use client'

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import { supabase, Product } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import CategoryGrid from '@/components/CategoryGrid'
import { CATEGORIES } from '@/lib/constants'

function ProductsContent() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category')
  const searchQuery = searchParams.get('search')
  
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(category || '전체')
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [showScrollTop, setShowScrollTop] = useState(false)

  // URL 파라미터가 변경되면 selectedCategory 업데이트
  useEffect(() => {
    setSelectedCategory(category || '전체')
  }, [category])

  const handleScroll = useCallback(() => {
    if (window.scrollY > 300) {
      setShowScrollTop(true)
    } else {
      setShowScrollTop(false)
    }
  }, [])

  // 스크롤 이벤트 처리
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

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from('products').select('*')
      
      // 검색어가 있으면 검색어 필터만 적용 (카테고리 무시)
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,origin.ilike.%${searchQuery}%`)
      } else {
        // 검색어가 없을 때만 카테고리 필터 적용
        if (selectedCategory && selectedCategory !== '전체') {
          query = query.eq('category', selectedCategory)
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setAllProducts(data || [])
    } catch (error) {
      console.error('상품 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery])

  // 카테고리나 검색어가 변경되면 상품 조회
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // 정렬된 상품 목록을 useMemo로 메모이제이션
  const products = useMemo(() => {
    if (sortOrder === 'default') {
      return allProducts
    }
    const sorted = [...allProducts]
    if (sortOrder === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price)
    } else if (sortOrder === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price)
    }
    return sorted
  }, [sortOrder, allProducts])

  const categories = useMemo(() => CATEGORIES, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* 카테고리 - 모바일만 표시 */}
      {!searchQuery && (
        <section className="py-8 bg-white md:hidden border-b-2 border-gray-300">
          <div className="container mx-auto px-4">
            <CategoryGrid selectedCategory={selectedCategory} />
          </div>
        </section>
      )}
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* 페이지 제목 & 정렬 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold mb-1">
              {searchQuery ? `"${searchQuery}" 검색 결과` : selectedCategory}
            </h1>
            {searchQuery && (
              <p className="text-gray-600 text-sm">
                총 <span className="font-semibold text-primary-800">{products.length}</span>개의 상품을 찾았습니다
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
        {!searchQuery && (
          <div className="hidden md:flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
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
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
          </div>
        ) : products.length === 0 ? (
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}

