'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Product, isSupabaseConfigured } from '@/lib/supabase/supabase'
import { isValidImageUrl } from '@/lib/product/product-utils'
import { formatPrice } from '@/lib/utils/utils'
import { getFinalPricing } from '@/lib/product/product.pricing'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { usePromotionModalStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'
import { addCartItemWithDB } from '@/lib/cart/cart-db'

const PRODUCTS_PER_PAGE = 3

interface RecommendationCategory {
  id: string
  name: string
  sort_order: number
  is_active: boolean
}

export default function RecommendationSection() {
  const [categories, setCategories] = useState<RecommendationCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const openPromotionModal = usePromotionModalStore((state) => state.openModal)
  const { user } = useAuth()

  // 페이지 수 계산
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE)
  
  // 현재 페이지의 상품들
  const currentProducts = products.slice(
    currentPage * PRODUCTS_PER_PAGE,
    (currentPage + 1) * PRODUCTS_PER_PAGE
  )

  useEffect(() => {
    const fetchCategories = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/recommendations')
        if (response.ok) {
          const data = await response.json()
          const categoriesList = data.categories || []
          setCategories(categoriesList)
          
          // 첫 번째 카테고리를 기본 선택
          if (categoriesList.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(categoriesList[0].id)
          }
        }
      } catch (error) {
        console.error('추천 카테고리 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    if (!selectedCategoryId) {
      setProducts([])
      setCurrentPage(0)
      return
    }

    const fetchProducts = async () => {
      if (!isSupabaseConfigured) {
        return
      }

      try {
        const response = await fetch(`/api/recommendations/${selectedCategoryId}/products`)
        
        if (!response.ok) {
          setProducts([])
          setCurrentPage(0)
          return
        }

        const data = await response.json()
        
        if (!data.products || data.products.length === 0) {
          setProducts([])
          setCurrentPage(0)
          return
        }

        // 상품 데이터 변환
        const activeProducts = (data.products || []).map((product: any) => ({
          ...product
        } as Product))
        setProducts(activeProducts as any)
        setCurrentPage(0) // 카테고리 변경 시 첫 페이지로 리셋
      } catch (error) {
        console.error('추천 상품 조회 실패:', error)
        setProducts([])
        setCurrentPage(0)
      }
    }

    fetchProducts()
  }, [selectedCategoryId])

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
          {categories.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(selectedCategoryId === category.id ? null : category.id)}
                    className="px-5 py-2.5 rounded-lg font-medium text-base whitespace-nowrap transition"
                    style={{
                      backgroundColor: selectedCategoryId === category.id ? '#D9C79E' : '#FFFFFF',
                      color: selectedCategoryId === category.id ? '#FFFFFF' : '#2A2A2A',
                      border: '1px solid #D9C79E'
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white pt-2 pb-4 -mx-2 px-2 relative z-10">
          {products.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              해당 카테고리에 상품이 없습니다.
            </div>
          ) : (
            <>
              <div 
                className="space-y-4 px-2 bg-white overflow-hidden"
                onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
                onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
                onTouchEnd={() => {
                  if (!touchStart || !touchEnd) return
                  const distance = touchStart - touchEnd
                  const isLeftSwipe = distance > 50
                  const isRightSwipe = distance < -50

                  if (isLeftSwipe && currentPage < totalPages - 1) {
                    setCurrentPage(currentPage + 1)
                  }
                  if (isRightSwipe && currentPage > 0) {
                    setCurrentPage(currentPage - 1)
                  }

                  setTouchStart(null)
                  setTouchEnd(null)
                }}
              >
                {currentProducts.map((product) => {
            const hasValidImage = isValidImageUrl(product.image_url)
            const shouldRenderImage = hasValidImage && !product.image_url?.includes('via.placeholder.com')

            const timedealDiscountPercent = (product as any).timedeal_discount_percent || 0
            const pricing = getFinalPricing({
              basePrice: product.price,
              timedealDiscountPercent,
              promotion: product.promotion,
              weightGram: product.weight_gram,
            })

            const finalDiscountPercent = pricing.discountPercent
            const finalPrice = pricing.finalPrice
            const pricePer100g = pricing.pricePer100g

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
                  prefetch={false}
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
                    {shouldRenderImage && product.image_url ? (
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
                          toast.success('장바구니에 추가되었습니다!', { icon: '🛒', id: 'toast-cart-added' })
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

              {/* 인디케이터 점 */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4 pb-2">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index)}
                      className={`w-2 h-2 rounded-full transition ${
                        currentPage === index
                          ? 'bg-gray-800'
                          : 'bg-gray-300'
                      }`}
                      aria-label={`페이지 ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="bg-white h-8 -mt-4"></div>
    </section>
  )
}

