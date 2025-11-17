'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { supabase, Product, isSupabaseConfigured } from '@/lib/supabase'
import { isFlashSaleActive, getFlashSalePrice, isValidImageUrl } from '@/lib/product-utils'
import { formatPrice } from '@/lib/utils'
import FlashSaleCountdown from './FlashSaleCountdown'
import ProductCardSkeleton from './skeletons/ProductCardSkeleton'
import { usePromotionModalStore, useWishlistStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { addCartItemWithDB } from '@/lib/cart-db'
import { toggleWishlistDB } from '@/lib/wishlist-db'

export default function FlashSaleSection() {
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [flashSaleTitle, setFlashSaleTitle] = useState('오늘만 특가!')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isFetchingTitleRef = useRef(false) // 중복 호출 방지
  const openPromotionModal = usePromotionModalStore((state) => state.openModal)
  const { user } = useAuth()
  const wishlistIds = useWishlistStore((state) => state.items)

  useEffect(() => {
    const fetchFlashSaleProducts = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        const now = new Date().toISOString()
        
        // 타임딜 종료 시간이 아직 지나지 않은 상품 조회
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .not('flash_sale_end_time', 'is', null)
          .gte('flash_sale_end_time', now)
          .gt('flash_sale_stock', 0)
          .order('flash_sale_end_time', { ascending: true })
          .limit(10)

        if (error) throw error

        // 활성화된 타임딜만 필터링 (시작 시간 체크 포함)
        const activeProducts = (data || []).filter((product: Product) => isFlashSaleActive(product))
        setFlashSaleProducts(activeProducts)
      } catch (error) {
        console.error('타임딜 상품 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchFlashSaleTitle = async () => {
      // 중복 호출 방지
      if (isFetchingTitleRef.current) return
      
      isFetchingTitleRef.current = true
      try {
        const res = await fetch('/api/admin/flash-sale-settings')
        if (res.ok) {
          const data = await res.json()
          if (data.title) {
            setFlashSaleTitle(data.title)
          }
        }
      } catch (error) {
        console.error('타임딜 제목 조회 실패:', error)
      } finally {
        isFetchingTitleRef.current = false
      }
    }

    fetchFlashSaleProducts()
    fetchFlashSaleTitle()
    
    // 1분마다 갱신 (타임딜 종료 확인)
    const interval = setInterval(fetchFlashSaleProducts, 60000)
    return () => clearInterval(interval)
  }, [])


  if (loading) {
    return (
      <section className="py-6 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏰</span>
              <h2 className="text-xl font-bold text-primary-900">{flashSaleTitle}</h2>
            </div>
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

  if (flashSaleProducts.length === 0) {
    return null
  }

  return (
      <section className="py-6 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏰</span>
                <h2 className="text-xl font-bold text-primary-900">{flashSaleTitle}</h2>
              </div>
            {flashSaleProducts.length > 0 && flashSaleProducts[0].flash_sale_end_time && (
              <div className="flex items-center">
                <FlashSaleCountdown product={flashSaleProducts[0]} />
              </div>
            )}
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {flashSaleProducts.map((product) => {
            const flashSalePrice = getFlashSalePrice(product)
            const hasValidImage = isValidImageUrl(product.image_url)
            const shouldRenderImage = hasValidImage && !product.image_url.includes('via.placeholder.com')
            const isLowStock = product.flash_sale_stock && product.flash_sale_stock <= 5

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="flex-shrink-0 w-[180px] bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <div className="relative aspect-square bg-gray-200">
                  {/* 타임딜 배지 */}
                  <div className="absolute top-0 left-0 z-10 flex">
                    <span className="bg-red-600 text-white px-2 py-1 text-xs font-bold shadow-lg">
                      타임딜
                    </span>
                    {/* 타임딜일 때 프로모션 배지 오른쪽에 표시 */}
                    {product.promotion_type && (
                      <span className="bg-red-600 text-white px-2 py-1 text-xs font-bold shadow-lg">
                        {product.promotion_type}
                      </span>
                    )}
                  </div>
                  
                  {/* 품절 임박 배지 */}
                  {isLowStock && (
                    <div className="absolute top-0 right-0 z-10">
                      <span className="bg-orange-500 text-white px-2 py-1 text-xs font-bold shadow-lg">
                        품절임박
                      </span>
                    </div>
                  )}

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
                          {flashSalePrice ? formatPrice(flashSalePrice) : formatPrice(product.price * (1 - product.discount_percent / 100))}<span className="text-xs text-gray-600">원</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 할인 미적용 시에도 1줄을 비워 동일 높이 확보 (줄간격 최소화) */}
                      <div className="invisible h-1 leading-none">.</div>
                      <div className="flex items-baseline mt-0 leading-tight">
                        <span className="text-base font-bold text-primary-900">
                          {flashSalePrice ? formatPrice(flashSalePrice) : formatPrice(product.price)}<span className="text-xs text-gray-600">원</span>
                        </span>
                      </div>
                    </>
                  )}

                  {/* 재고 표시 */}
                  {product.flash_sale_stock && product.flash_sale_stock > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      남은 수량: <span className="font-bold text-red-600">{product.flash_sale_stock}개</span>
                    </div>
                  )}

                  {/* 타임딜 + 프로모션일 때: 1+1 골라담기 박스 */}
                  {product.promotion_type && (
                    <div className="mt-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openPromotionModal(product.id)
                        }}
                        className="w-full py-2 px-3 bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700 text-sm font-bold rounded-lg hover:from-pink-200 hover:to-pink-300 transition shadow-md flex items-center justify-between"
                      >
                        <span className="text-left">{product.promotion_type} 골라담기</span>
                        <span className="text-pink-700">›</span>
                      </button>
                    </div>
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

