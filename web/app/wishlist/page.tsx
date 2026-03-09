'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ProductCard from '@/components/product/ProductCard'
import PromotionModalWrapper from '@/components/common/PromotionModalWrapper'
import { supabase, Product } from '@/lib/supabase/supabase'
import { useWishlistStore, useCartStore } from '@/lib/store'
import { enrichProducts, PRODUCT_SELECT_FIELDS } from '@/lib/product/product-client'

export default function WishlistPage() {
  const router = useRouter()
  const wishlistIds = useWishlistStore((state) => state.items)
  const cartCount = useCartStore((state) => state.getTotalItems())
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const firstLoadRef = useRef(true)

  // 위시리스트 상품 불러오기
  useEffect(() => {
    const loadWishlistProducts = async () => {
      if (wishlistIds.length === 0) {
        setWishlistProducts([])
        setLoading(false)
        return
      }

      if (firstLoadRef.current) {
        setLoading(true)
      } else {
        setLoading(false)
        setWishlistProducts((prev) => prev.filter((p) => wishlistIds.includes(p.id)))
      }
      try {
        // API 라우트를 통해 서버 사이드에서 조회
        const response = await fetch('/api/wishlist/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: wishlistIds }),
        })

        if (!response.ok) {
          console.error('위시리스트 상품 조회 실패:', response.status)
          setWishlistProducts([])
          setLoading(false)
          return
        }

        const data = await response.json()
        setWishlistProducts((data.products || []) as Product[])
      } catch (error) {
        console.error('위시리스트 상품 조회 실패:', error)
        setWishlistProducts([])
      } finally {
        setLoading(false)
        firstLoadRef.current = false
      }
    }

    loadWishlistProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistIds.join(',')]) // 배열을 문자열로 변환하여 비교

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
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
          
          {/* 중앙: 제목 */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              나의 찜
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

      <main className="flex-1 container mx-auto px-2 pt-6 pb-0 md:pb-32">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="text-center py-32 md:py-40">
            <p className="text-xl text-gray-600 mb-6">찜한 상품이 없습니다.</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-white text-red-600 border border-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {wishlistProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <Footer />

      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}

