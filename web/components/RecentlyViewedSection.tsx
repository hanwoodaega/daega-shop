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
import { useAuth } from '@/lib/auth-context'
import { addCartItemWithDB } from '@/lib/cart-db'

export default function RecentlyViewedSection() {
  const [recentProducts, setRecentProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

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

        // UUID 형식인지 확인하는 함수
        const isUUID = (str: string): boolean => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          return uuidRegex.test(str)
        }

        // UUID와 slug 분리
        const uuids = recentIds.filter(id => isUUID(id))
        const slugs = recentIds.filter(id => !isUUID(id))

        let allProducts: Product[] = []

        const selectFields = 'id,slug,brand,name,price,image_url'

        // UUID로 조회
        if (uuids.length > 0) {
          const { data: uuidData, error: uuidError } = await supabase
            .from('products')
            .select(selectFields)
            .in('id', uuids)
          
          if (uuidError) throw uuidError
          if (uuidData) allProducts = [...allProducts, ...uuidData]
        }

        // slug로 조회
        if (slugs.length > 0) {
          const { data: slugData, error: slugError } = await supabase
            .from('products')
            .select(selectFields)
            .in('slug', slugs)
          
          if (slugError) throw slugError
          if (slugData) {
            // 중복 제거: 이미 UUID로 조회된 상품은 제외
            const existingIds = new Set(allProducts.map(p => p.id))
            const newProducts = slugData.filter((p: Product) => !existingIds.has(p.id))
            allProducts = [...allProducts, ...newProducts]
          }
        }

        // 중복 제거 (같은 상품이 UUID와 slug로 각각 조회될 수 있음)
        const uniqueProducts = new Map<string, Product>()
        allProducts.forEach((p: Product) => {
          if (!uniqueProducts.has(p.id)) {
            uniqueProducts.set(p.id, p)
          }
        })

        // 최근 본 순서대로 정렬 (localStorage 순서 유지)
        const orderedProducts = recentIds
          .map(id => {
            // UUID인 경우 id로 찾기, slug인 경우 slug로 찾기
            return Array.from(uniqueProducts.values()).find((p: Product) => 
              isUUID(id) ? p.id === id : p.slug === id
            )
          })
          .filter((p): p is Product => p !== undefined)
          // 중복 제거 (같은 상품이 여러 번 나타날 수 있음)
          .filter((p, index, self) => index === self.findIndex(pr => pr.id === p.id))

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
                href={`/products/${product.slug || product.id}`}
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
                        discount_percent: product.promotion?.discount_percent ?? undefined,
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

                <div className="p-3">
                  {product.brand && (
                    <div className="text-sm font-bold text-primary-900 line-clamp-1 leading-tight tracking-tight mb-0">
                      {product.brand}
                    </div>
                  )}
                  <h3 className="text-sm font-medium mb-0 line-clamp-1 text-primary-900 leading-tight tracking-tight">
                    {product.name}
                  </h3>

                  {/* 가격 영역을 2줄로 고정하여 카드 높이를 통일 */}
                  {product.promotion?.type === 'percent' && product.promotion.discount_percent && product.promotion.discount_percent > 0 ? (
                    <>
                      <div className="text-xs text-gray-500 line-through mt-0 leading-tight">
                        {formatPrice(product.price)}원
                      </div>
                      <div className="flex items-baseline gap-2 mt-0 leading-tight">
                        <span className="text-base md:text-lg font-bold text-red-600">{product.promotion.discount_percent}%</span>
                        <span className="text-base font-extrabold text-primary-900">
                          {formatPrice(product.price * (1 - product.promotion.discount_percent / 100))}<span className="text-xs text-gray-600">원</span>
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

