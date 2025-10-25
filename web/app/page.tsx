'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import { supabase, Product } from '@/lib/supabase'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  useEffect(() => {
    sortProducts()
  }, [sortOrder])

  const sortProducts = () => {
    if (products.length === 0) return
    
    let sorted = [...products]
    if (sortOrder === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price)
    } else if (sortOrder === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price)
    }
    setProducts(sorted)
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8)
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('상품 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

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
        <section className="py-8 bg-white md:hidden border-b-2 border-gray-300">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-5 gap-3">
              <Link href="/products" className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition shadow-md">
                </div>
                <span className="text-xs font-medium text-gray-700 mt-2">전체</span>
              </Link>
              <Link href="/products?category=한우" className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition shadow-md">
                </div>
                <span className="text-xs font-medium text-gray-700 mt-2">한우</span>
              </Link>
              <Link href="/products?category=돼지고기" className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition shadow-md">
                </div>
                <span className="text-xs font-medium text-gray-700 mt-2">돼지고기</span>
              </Link>
              <Link href="/products?category=수입육" className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition shadow-md">
                </div>
                <span className="text-xs font-medium text-gray-700 mt-2">수입육</span>
              </Link>
              <Link href="/products?category=닭" className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition shadow-md">
                </div>
                <span className="text-xs font-medium text-gray-700 mt-2">닭</span>
              </Link>
              <Link href="/products?category=가공육" className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition shadow-md">
                </div>
                <span className="text-xs font-medium text-gray-700 mt-2">가공육</span>
              </Link>
              <Link href="/products?category=조리육" className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition shadow-md">
                </div>
                <span className="text-xs font-medium text-gray-700 mt-2">조리육</span>
              </Link>
              <Link href="/products?category=야채" className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition shadow-md">
                </div>
                <span className="text-xs font-medium text-gray-700 mt-2">야채</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 전체 상품 */}
        <section className="pt-8 pb-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-primary-900">전체 상품</h2>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
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
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600">등록된 상품이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
          className="fixed bottom-8 right-8 bg-white/60 backdrop-blur-sm text-primary-800 p-4 rounded-full shadow-lg hover:bg-white/75 transition-all duration-300 z-50 hover:scale-110"
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
    </div>
  )
}

