'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ProductCard from '@/components/ProductCard'
import ScrollToTop from '@/components/common/ScrollToTop'
import { supabase, Product, isSupabaseConfigured } from '@/lib/supabase'
import CategoryGrid from '@/components/CategoryGrid'

export default function Home() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
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
      <Header />
      
      <main className="flex-1">
        {/* 히어로 섹션 */}
        <section className="bg-gradient-to-r from-primary-800 to-primary-900 text-white py-24">
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
        <section className="py-4 bg-gray-100 md:hidden">
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

      <ScrollToTop className="bottom-24 right-8 bg-white/60 backdrop-blur-sm text-primary-800 hover:bg-white/75 hover:scale-110" />
      <Footer />
      <BottomNavbar />
    </div>
  )
}

