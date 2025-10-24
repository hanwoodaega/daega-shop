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

  useEffect(() => {
    fetchProducts()
  }, [])

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
            <p className="text-sm tracking-widest text-gray-300 mb-6">
              DAEGA PREMIUM MEAT
            </p>
            <p className="text-xl mb-8 text-gray-200">
              최고급 한우와 신선한 정육을 합리적인 가격으로
            </p>
            <Link href="/products">
              <button className="bg-white text-primary-900 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition shadow-lg">
                상품 둘러보기
              </button>
            </Link>
          </div>
        </section>

        {/* 전체 상품 */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-primary-900">전체 상품</h2>
              <Link href="/products" className="text-primary-700 hover:text-primary-900 font-medium flex items-center space-x-1">
                <span>전체보기</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 인기 카테고리 */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-primary-900">카테고리</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Link href="/products?category=한우" className="group">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:-translate-y-1 border border-gray-200">
                  <h3 className="text-xl font-bold text-center mb-2 text-primary-900">한우</h3>
                  <p className="text-gray-600 text-center text-sm leading-relaxed">
                    최고급 1++ 등급
                  </p>
                </div>
              </Link>
              <Link href="/products?category=돼지고기" className="group">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:-translate-y-1 border border-gray-200">
                  <h3 className="text-xl font-bold text-center mb-2 text-primary-900">돼지고기</h3>
                  <p className="text-gray-600 text-center text-sm leading-relaxed">
                    신선한 국내산
                  </p>
                </div>
              </Link>
              <Link href="/products?category=수입육" className="group">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:-translate-y-1 border border-gray-200">
                  <h3 className="text-xl font-bold text-center mb-2 text-primary-900">수입육</h3>
                  <p className="text-gray-600 text-center text-sm leading-relaxed">
                    프리미엄 수입육
                  </p>
                </div>
              </Link>
              <Link href="/products?category=닭" className="group">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:-translate-y-1 border border-gray-200">
                  <h3 className="text-xl font-bold text-center mb-2 text-primary-900">닭</h3>
                  <p className="text-gray-600 text-center text-sm leading-relaxed">
                    신선한 닭고기
                  </p>
                </div>
              </Link>
              <Link href="/products?category=가공육" className="group">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:-translate-y-1 border border-gray-200">
                  <h3 className="text-xl font-bold text-center mb-2 text-primary-900">가공육</h3>
                  <p className="text-gray-600 text-center text-sm leading-relaxed">
                    소시지, 햄 등
                  </p>
                </div>
              </Link>
              <Link href="/products?category=조리육" className="group">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:-translate-y-1 border border-gray-200">
                  <h3 className="text-xl font-bold text-center mb-2 text-primary-900">조리육</h3>
                  <p className="text-gray-600 text-center text-sm leading-relaxed">
                    양념 갈비, 불고기
                  </p>
                </div>
              </Link>
              <Link href="/products?category=야채" className="group">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:-translate-y-1 border border-gray-200">
                  <h3 className="text-xl font-bold text-center mb-2 text-primary-900">야채</h3>
                  <p className="text-gray-600 text-center text-sm leading-relaxed">
                    신선한 채소
                  </p>
                </div>
              </Link>
              <Link href="/products" className="group">
                <div className="bg-gradient-to-br from-primary-800 to-primary-900 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:-translate-y-1 border border-primary-700">
                  <h3 className="text-xl font-bold text-center mb-2 text-white">전체상품</h3>
                  <p className="text-gray-200 text-center text-sm leading-relaxed">
                    모든 제품 보기
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA 섹션 */}
        <section className="bg-primary-800 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              지금 바로 신선한 정육을 만나보세요
            </h2>
            <p className="text-xl mb-8 text-gray-200">
              오늘 주문하시면 내일 아침 신선하게 배송됩니다
            </p>
            <Link href="/products">
              <button className="bg-white text-primary-900 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition shadow-lg">
                쇼핑 시작하기
              </button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

