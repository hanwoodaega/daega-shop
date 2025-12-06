'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Product, isSupabaseConfigured } from '@/lib/supabase'
import { isValidImageUrl } from '@/lib/product-utils'
import { formatPrice } from '@/lib/utils'
import ProductCardSkeleton from './skeletons/ProductCardSkeleton'
import { usePromotionModalStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { addCartItemWithDB } from '@/lib/cart-db'

const CATEGORIES = [
  '아이 / 어린이',
  '다이어터',
  '부모님',
  '캠핑/BBQ',
  '홈파티',
  '빠르게 조리 가능',
  '1인분 / 소포장'
]

export default function RecommendationSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const openPromotionModal = usePromotionModalStore((state) => state.openModal)
  const { user } = useAuth()

  useEffect(() => {
    const fetchProducts = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        // 전체 상품 조회 (일단 아무 상품이나)
        const response = await fetch('/api/products?page=1&limit=4')
        
        if (!response.ok) {
          setProducts([])
          setLoading(false)
          return
        }

        const data = await response.json()
        
        if (!data.products || data.products.length === 0) {
          setProducts([])
          setLoading(false)
          return
        }

        // 상품 데이터 변환
        const activeProducts = (data.products || []).map((product: any) => ({
          ...product
        } as Product))
        setProducts(activeProducts as any)
      } catch (error) {
        console.error('추천 상품 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (loading) {
    return (
      <section className="py-6" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="container mx-auto px-5">
          <div className="mb-8">
            <div className="flex flex-col gap-2">
              <h2 
                className="font-extrabold md:text-[28px] text-[24px]" 
                style={{ 
                  color: '#2A2A2A',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 800,
                  letterSpacing: '-0.5px'
                }}
              >
                맞춤별 추천
              </h2>
              <p 
                className="md:text-[20px] text-[18px]" 
                style={{ 
                  color: '#7A6F62',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 500,
                  lineHeight: '1.5'
                }}
              >
                누구에게나 딱 맞는 추천 상품을 골라보세요
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
      <section className="pt-8 overflow-x-hidden" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="container mx-auto px-5">
          <div className="mb-8">
            <div className="flex flex-col gap-2">
              <h2 
                className="font-extrabold md:text-[28px] text-[24px]" 
                style={{ 
                  color: '#2A2A2A',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 800,
                  letterSpacing: '-0.5px'
                }}
              >
                맞춤별 추천
              </h2>
              <p 
                className="md:text-[20px] text-[18px]" 
                style={{ 
                  color: '#7A6F62',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 500,
                  lineHeight: '1.5'
                }}
              >
                누구에게나 딱 맞는 추천 상품을 골라보세요
              </p>
            </div>
          </div>

          {/* 카테고리 필터 버튼 */}
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  className="px-5 py-2.5 rounded-lg font-medium text-base whitespace-nowrap transition"
                  style={{
                    backgroundColor: selectedCategory === category ? '#D9C79E' : '#FFFFFF',
                    color: selectedCategory === category ? '#FFFFFF' : '#2A2A2A',
                    border: '1px solid #D9C79E'
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white pt-2 pb-4 -mx-2 px-2 relative z-10">
          <div className="space-y-4 px-2 bg-white">
          {products.map((product) => {
            const hasValidImage = isValidImageUrl(product.image_url)
            const shouldRenderImage = hasValidImage && !product.image_url.includes('via.placeholder.com')

            // 타임딜 할인율 (우선순위 높음)
            const timedealDiscountPercent = (product as any).timedeal_discount_percent || 0

            // 프로모션 할인율 (percent 타입)
            const promotionDiscountPercent = product.promotion?.type === 'percent' && product.promotion.discount_percent
              ? product.promotion.discount_percent
              : 0

            // 최종 할인율 (타임딜 우선, 없으면 프로모션)
            const finalDiscountPercent = timedealDiscountPercent > 0 ? timedealDiscountPercent : promotionDiscountPercent

            // 최종 할인가 계산
            const finalPrice = finalDiscountPercent > 0
              ? Math.round(product.price * (1 - finalDiscountPercent / 100))
              : product.price

            // 100g당 가격 계산
            const pricePer100g = product.weight_gram && product.weight_gram > 0
              ? (finalPrice / product.weight_gram) * 100
              : null

            // 프로모션 배지 텍스트
            const promotionBadge = product.promotion?.type === 'bogo' && product.promotion.buy_qty
              ? `${product.promotion.buy_qty}+1`
              : null

            return (
              <div 
                key={product.id} 
                className="bg-white rounded-xl overflow-hidden"
                style={{
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <Link
                  href={`/product/${product.slug || product.id}`}
                  className="flex gap-4 p-3 transition hover:opacity-90"
                >
                  <div className="relative w-24 h-24 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden">
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
                        sizes="96px"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs bg-gray-200">
                        이미지 준비중
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      {product.brand && (
                        <div className="text-sm font-bold line-clamp-1 mb-1" style={{ color: '#222222' }}>
                          {product.brand}
                        </div>
                      )}
                      <div className="flex items-center mb-2">
                        <h3 className="text-base font-medium line-clamp-2" style={{ color: '#222222' }}>
                          {product.name}
                        </h3>
                        {product.weight_gram && (
                          <span className="text-base font-medium ml-1" style={{ color: '#222222' }}>
                            {product.weight_gram}G
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        {finalDiscountPercent > 0 ? (
                          <>
                            <div className="text-xs text-gray-500 line-through mb-1">
                              {formatPrice(product.price)}원
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-bold text-red-600">{finalDiscountPercent}%</span>
                              <span className="text-base font-extrabold" style={{ color: '#222222' }}>
                                {formatPrice(finalPrice)}<span className="text-xs" style={{ color: '#222222' }}>원</span>
                              </span>
                            </div>
                            {pricePer100g && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                (100g당 {formatPrice(pricePer100g)}원)
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="text-base font-bold" style={{ color: '#222222' }}>
                              {formatPrice(product.price)}<span className="text-xs" style={{ color: '#222222' }}>원</span>
                            </div>
                            {pricePer100g && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                (100g당 {formatPrice(pricePer100g)}원)
                              </p>
                            )}
                          </>
                        )}
                      </div>

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
                        className="bg-white p-2 rounded-full shadow-md hover:bg-primary-800 hover:text-white transition flex-shrink-0"
                        aria-label="장바구니에 담기"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
          </div>
        </div>
        <div className="bg-white h-8 -mt-4"></div>
    </section>
  )
}

