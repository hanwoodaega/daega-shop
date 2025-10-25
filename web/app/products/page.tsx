'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase, Product } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'

function ProductsContent() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category')
  const searchQuery = searchParams.get('search')
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(category || '전체')
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')

  // URL 파라미터가 변경되면 selectedCategory 업데이트
  useEffect(() => {
    setSelectedCategory(category || '전체')
  }, [category])

  // 카테고리나 검색어가 변경되면 상품 조회
  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, searchQuery])

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
    setLoading(true)
    try {
      let query = supabase.from('products').select('*')
      
      // 카테고리 필터
      if (selectedCategory && selectedCategory !== '전체') {
        query = query.eq('category', selectedCategory)
      }
      
      // 검색어 필터 (상품명 또는 설명에서 검색)
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,origin.ilike.%${searchQuery}%`)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('상품 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['전체', '한우', '돼지고기', '수입육', '닭', '가공육', '조리육', '야채']

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* 카테고리 - 모바일만 표시 */}
      <section className="py-8 bg-white md:hidden border-b-2 border-gray-300">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-5 gap-3">
            <Link href="/products" className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center hover:scale-110 transition shadow-md ${selectedCategory === '전체' ? 'border-2 border-black' : ''}`}>
              </div>
              <span className="text-xs font-medium text-gray-700 mt-2">전체</span>
            </Link>
            <Link href="/products?category=한우" className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center hover:scale-110 transition shadow-md ${selectedCategory === '한우' ? 'border-2 border-black' : ''}`}>
              </div>
              <span className="text-xs font-medium text-gray-700 mt-2">한우</span>
            </Link>
            <Link href="/products?category=돼지고기" className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center hover:scale-110 transition shadow-md ${selectedCategory === '돼지고기' ? 'border-2 border-black' : ''}`}>
              </div>
              <span className="text-xs font-medium text-gray-700 mt-2">돼지고기</span>
            </Link>
            <Link href="/products?category=수입육" className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center hover:scale-110 transition shadow-md ${selectedCategory === '수입육' ? 'border-2 border-black' : ''}`}>
              </div>
              <span className="text-xs font-medium text-gray-700 mt-2">수입육</span>
            </Link>
            <Link href="/products?category=닭" className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center hover:scale-110 transition shadow-md ${selectedCategory === '닭' ? 'border-2 border-black' : ''}`}>
              </div>
              <span className="text-xs font-medium text-gray-700 mt-2">닭</span>
            </Link>
            <Link href="/products?category=가공육" className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center hover:scale-110 transition shadow-md ${selectedCategory === '가공육' ? 'border-2 border-black' : ''}`}>
              </div>
              <span className="text-xs font-medium text-gray-700 mt-2">가공육</span>
            </Link>
            <Link href="/products?category=조리육" className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center hover:scale-110 transition shadow-md ${selectedCategory === '조리육' ? 'border-2 border-black' : ''}`}>
              </div>
              <span className="text-xs font-medium text-gray-700 mt-2">조리육</span>
            </Link>
            <Link href="/products?category=야채" className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center hover:scale-110 transition shadow-md ${selectedCategory === '야채' ? 'border-2 border-black' : ''}`}>
              </div>
              <span className="text-xs font-medium text-gray-700 mt-2">야채</span>
            </Link>
          </div>
        </div>
      </section>
      
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
            onChange={(e) => setSortOrder(e.target.value as any)}
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

      <Footer />
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
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}

