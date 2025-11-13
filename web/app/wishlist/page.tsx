'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ProductCard from '@/components/ProductCard'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { supabase, Product } from '@/lib/supabase'
import { useWishlistStore } from '@/lib/store'

export default function WishlistPage() {
  const router = useRouter()
  const wishlistIds = useWishlistStore((state) => state.items)
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // 위시리스트 상품 불러오기
  useEffect(() => {
    const loadWishlistProducts = async () => {
      if (wishlistIds.length === 0) {
        setWishlistProducts([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .in('id', wishlistIds)

        if (!error && data) {
          setWishlistProducts(data)
        }
      } catch (error) {
        console.error('위시리스트 상품 조회 실패:', error)
      } finally {
        setLoading(false)
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
          
          {/* 오른쪽: 홈 버튼 */}
          <div className="ml-auto flex items-center gap-0">
            <button
              onClick={() => router.push('/')}
              aria-label="홈으로"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-8 h-8 md:w-9 md:h-9" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-2 pt-6 pb-32">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">❤️</div>
            <p className="text-xl text-gray-600 mb-6">찜한 상품이 없습니다.</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-primary-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-900 transition"
            >
              쇼핑하기
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

      <div className="pb-20">
        <Footer />
      </div>

      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}

