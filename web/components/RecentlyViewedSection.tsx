'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { supabase, Product, isSupabaseConfigured } from '@/lib/supabase'
import { getRecentlyViewed } from '@/lib/recently-viewed'
import { isValidImageUrl } from '@/lib/product-utils'
import { formatPrice } from '@/lib/utils'
import ProductCardSkeleton from './skeletons/ProductCardSkeleton'
import { useWishlistStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { addCartItemWithDB } from '@/lib/cart-db'
import { toggleWishlistDB } from '@/lib/wishlist-db'

export default function RecentlyViewedSection() {
  const [recentProducts, setRecentProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const wishlistIds = useWishlistStore((state) => state.items)

  useEffect(() => {
    const fetchRecentProducts = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        const recentIds = getRecentlyViewed()
        
        if (recentIds.length === 0) {
          setRecentProducts([])
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .in('id', recentIds)
          .order('created_at', { ascending: false })

        if (error) throw error

        // 최근 본 순서대로 정렬 (localStorage 순서 유지)
        const orderedProducts = recentIds
          .map(id => data?.find((p: Product) => p.id === id))
          .filter((p): p is Product => p !== undefined)

        setRecentProducts(orderedProducts)
      } catch (error) {
        console.error('최근 본 상품 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentProducts()
  }, [])

  if (loading) {
    return (
      <section className="py-4 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-primary-900">최근 본 상품</h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[180px]">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (recentProducts.length === 0) {
    return null
  }

  return (
    <section className="py-4 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-primary-900">최근 본 상품</h2>
        </div>

        <div
          className="flex gap-4 overflow-x-auto pb-2"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {recentProducts.map((product) => {
            const hasValidImage = isValidImageUrl(product.image_url)
            const shouldRenderImage = hasValidImage && !product.image_url.includes('via.placeholder.com')

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="flex-shrink-0 w-[180px] bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <div className="relative aspect-square bg-gray-200">
                  {shouldRenderImage ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="180px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-gray-200">
                      이미지 준비중
                    </div>
                  )}

                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">품절</span>
                    </div>
                  )}
                  
                  {/* 장바구니 버튼 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (product.stock <= 0) {
                        toast.error('품절된 상품입니다', { icon: '😢' })
                        return
                      }
                      const cartItem = {
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: 1,
                        imageUrl: product.image_url,
                        discount_percent: product.discount_percent ?? undefined,
                        brand: product.brand ?? undefined,
                        stock: product.stock,
                      }
                      addCartItemWithDB(user?.id || null, cartItem)
                      toast.success('장바구니에 추가되었습니다!', { icon: '🛒' })
                    }}
                    className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-primary-800 hover:text-white transition z-10"
                    aria-label="장바구니에 담기"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </button>
                </div>

                <div className="p-3">
                  {product.brand && (
                    <div className="flex items-center justify-between mb-0">
                      <div className="text-sm font-bold text-primary-900 line-clamp-1 flex-1 leading-tight tracking-tight">
                        {product.brand}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleWishlistDB(user?.id || null, product.id).then((success) => {
                            if (success) {
                              const isWished = wishlistIds.includes(product.id)
                              toast.success(
                                isWished ? '찜 목록에서 제거되었습니다' : '찜 목록에 추가되었습니다!',
                                { icon: isWished ? '💔' : '❤️' }
                              )
                            } else {
                              toast.error('오류가 발생했습니다. 다시 시도해주세요.', { icon: '❌' })
                            }
                          })
                        }}
                        className="ml-2 p-1 hover:scale-110 transition-transform flex-shrink-0"
                        aria-label="찜하기"
                      >
                        {wishlistIds.includes(product.id) ? (
                          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                  {!product.brand && (
                    <div className="flex items-center justify-end mb-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleWishlistDB(user?.id || null, product.id).then((success) => {
                            if (success) {
                              const isWished = wishlistIds.includes(product.id)
                              toast.success(
                                isWished ? '찜 목록에서 제거되었습니다' : '찜 목록에 추가되었습니다!',
                                { icon: isWished ? '💔' : '❤️' }
                              )
                            } else {
                              toast.error('오류가 발생했습니다. 다시 시도해주세요.', { icon: '❌' })
                            }
                          })
                        }}
                        className="p-1 hover:scale-110 transition-transform flex-shrink-0"
                        aria-label="찜하기"
                      >
                        {wishlistIds.includes(product.id) ? (
                          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                  <h3 className="text-sm font-medium mb-0 line-clamp-1 text-primary-900 leading-tight tracking-tight">
                    {product.name}
                  </h3>

                  {/* 가격 영역을 2줄로 고정하여 카드 높이를 통일 */}
                  {product.discount_percent && product.discount_percent > 0 ? (
                    <>
                      <div className="text-xs text-gray-500 line-through mt-0 leading-tight">
                        {formatPrice(product.price)}원
                      </div>
                      <div className="flex items-baseline gap-2 mt-0 leading-tight">
                        <span className="text-base md:text-lg font-bold text-red-600">{product.discount_percent}%</span>
                        <span className="text-base font-extrabold text-primary-900">
                          {formatPrice(product.price * (1 - product.discount_percent / 100))}<span className="text-xs text-gray-600">원</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 할인 미적용 시에도 1줄을 비워 동일 높이 확보 (줄간격 최소화) */}
                      <div className="invisible h-1 leading-none">.</div>
                      <div className="flex items-baseline mt-0 leading-tight">
                        <span className="text-base font-bold text-primary-900">
                          {formatPrice(product.price)}<span className="text-xs text-gray-600">원</span>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <style jsx global>{`
        [class*="overflow-x-auto"]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}

