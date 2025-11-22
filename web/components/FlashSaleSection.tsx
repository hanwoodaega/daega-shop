'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { supabase, Product, isSupabaseConfigured } from '@/lib/supabase'
import { isValidImageUrl } from '@/lib/product-utils'
import { formatPrice } from '@/lib/utils'
import FlashSaleCountdown from './FlashSaleCountdown'
import ProductCardSkeleton from './skeletons/ProductCardSkeleton'
import { usePromotionModalStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { addCartItemWithDB } from '@/lib/cart-db'

export default function FlashSaleSection() {
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [flashSaleTitle, setFlashSaleTitle] = useState('오늘만 특가!')
  const [flashSaleSettings, setFlashSaleSettings] = useState<{ start_time?: string | null; end_time?: string | null } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isFetchingTitleRef = useRef(false) // 중복 호출 방지
  const openPromotionModal = usePromotionModalStore((state) => state.openModal)
  const { user } = useAuth()

  useEffect(() => {
    const fetchFlashSaleProducts = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        // 타임딜 컬렉션 조회
        const response = await fetch('/api/collections/timedeal?limit=10')
        
        if (!response.ok) {
          setFlashSaleProducts([])
          setLoading(false)
          return
        }

        const data = await response.json()
        
        // 타임딜 컬렉션이 없거나 상품이 없으면 빈 배열 반환
        if (!data.collection || !data.products || data.products.length === 0) {
          setFlashSaleProducts([])
          setLoading(false)
          return
        }
        
        // 종료 시간이 지났는지 확인
        if (data.collection.end_at) {
          const now = new Date()
          const endTime = new Date(data.collection.end_at)
          if (endTime <= now) {
            setFlashSaleProducts([])
            setLoading(false)
            return
          }
        }

        // 제목 설정
        if (data.title) {
          setFlashSaleTitle(data.title)
        }

        // 종료 시간 설정
        if (data.collection?.end_at) {
          setFlashSaleSettings({
            start_time: data.collection.start_at || null,
            end_time: data.collection.end_at
          })
        }

        // 상품 데이터 변환
        const activeProducts = (data.products || []).map((product: any) => ({
          ...product
        } as Product))
        setFlashSaleProducts(activeProducts as any)
      } catch (error) {
        console.error('타임딜 상품 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFlashSaleProducts()
    
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
              <h2 className="text-2xl font-bold text-primary-900">{flashSaleTitle}</h2>
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
      <section className="pt-8 overflow-x-hidden" style={{ backgroundColor: '#E0F2F1' }}>
        <div className="container mx-auto px-2">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 ml-4">
              <h2 className="text-2xl font-bold text-primary-900">{flashSaleTitle}</h2>
            </div>
            {flashSaleSettings?.end_time && (
              <div className="flex items-center ml-4">
                <FlashSaleCountdown flashSaleSettings={flashSaleSettings} className="text-2xl" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white pt-5 pb-0 -mx-2 px-3 relative z-10">
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto pb-2 px-3 bg-white"
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
          {flashSaleProducts.map((product) => {
            const hasValidImage = isValidImageUrl(product.image_url)
            const shouldRenderImage = hasValidImage && !product.image_url.includes('via.placeholder.com')

            // 프로모션 할인율 (percent 타입)
            const promotionDiscountPercent = product.promotion?.type === 'percent' && product.promotion.discount_percent
              ? product.promotion.discount_percent
              : 0

            // 최종 할인율 (프로모션만)
            const finalDiscountPercent = promotionDiscountPercent

            // 최종 할인가 (프로모션 할인가 또는 원가)
            const finalPrice = promotionDiscountPercent > 0
              ? Math.round(product.price * (1 - promotionDiscountPercent / 100))
              : product.price

            // 프로모션 배지 텍스트
            const promotionBadge = product.promotion?.type === 'bogo' && product.promotion.buy_qty
              ? `${product.promotion.buy_qty}+1`
              : null

            return (
              <div key={product.id} className="flex-shrink-0 w-[180px] flex flex-col bg-white rounded-lg overflow-hidden">
                <Link
                  href={`/products/${product.slug || product.id}`}
                  className="bg-white rounded-lg overflow-hidden transition shadow-sm flex flex-col flex-1 relative z-10"
                >
                  <div className="relative aspect-square bg-gray-200">
                    {/* 프로모션 배지 */}
                    {promotionBadge && (
                      <div className="absolute top-0 left-0 z-10">
                        <span className="bg-red-600 text-white px-2 py-1 text-xs font-bold shadow-lg">
                          {promotionBadge}
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

                    {/* 장바구니 버튼 */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const cartItem = {
                          productId: product.id,
                          name: product.name,
                          price: product.price,
                          quantity: 1,
                          imageUrl: product.image_url,
                          discount_percent: finalDiscountPercent > 0 ? finalDiscountPercent : undefined,
                          brand: product.brand ?? undefined,
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

                  <div className="px-2 pt-1 pb-3 bg-white">
                    {product.brand && (
                      <div className="text-sm font-bold text-primary-900 line-clamp-1 leading-tight tracking-tight mb-0 mt-1">
                        {product.brand}
                      </div>
                    )}
                    <h3 className="text-sm font-medium mb-0 line-clamp-1 text-primary-900 leading-tight tracking-tight mt-1">
                      {product.name}
                    </h3>

                    {/* 가격 영역: 원가, 할인율, 할인가 표시 */}
                    {finalDiscountPercent > 0 ? (
                      <>
                        <div className="text-xs text-gray-500 line-through mt-1 leading-tight">
                          {formatPrice(product.price)}원
                        </div>
                        <div className="flex items-baseline gap-2 mt-0 leading-tight">
                          <span className="text-base md:text-lg font-bold text-red-600">{finalDiscountPercent}%</span>
                          <span className="text-base font-extrabold text-primary-900">
                            {formatPrice(finalPrice)}<span className="text-xs text-gray-600">원</span>
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* 할인 미적용 시에도 1줄을 비워 동일 높이 확보 */}
                        <div className="invisible h-1 leading-none">.</div>
                        <div className="flex items-baseline mt-0 leading-tight">
                          <span className="text-base font-bold text-primary-900">
                            {formatPrice(product.price)}<span className="text-xs text-gray-600">원</span>
                          </span>
                        </div>
                      </>
                    )}

                    {/* 프로모션 상품 버튼 (BOGO 타입만) */}
                    {product.promotion?.type === 'bogo' && promotionBadge && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openPromotionModal(product.id)
                        }}
                        className="mt-2 w-full bg-white border border-gray-300 text-gray-900 py-2 px-3 text-xs font-medium rounded hover:bg-gray-50 transition flex items-center justify-between"
                      >
                        <span>{promotionBadge} 상품 골라담기</span>
                        <span className="text-gray-600">❯</span>
                      </button>
                    )}
                  </div>
                </Link>
              </div>
            )
          })}
          </div>
          
          {/* 전체보기 버튼 */}
          <div className="mt-0 px-4 pb-4 bg-white">
            <Link href="/collections/timedeal" className="block">
              <button className="w-full px-6 py-2.5 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                <span>전체보기</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Link>
          </div>
        </div>
        <div className="bg-white h-8 -mt-4"></div>
    </section>
  )
}

