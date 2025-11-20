'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import BottomNavbar from '@/components/BottomNavbar'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { supabase } from '@/lib/supabase'
import { Product } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils'

export default function GiftPage() {
  const router = useRouter()
  const [giftProducts, setGiftProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTarget, setSelectedTarget] = useState<string | null>('아이')
  const [selectedBudget, setSelectedBudget] = useState<string | null>('under-50k')
  const [targetProducts, setTargetProducts] = useState<Product[]>([])
  const [budgetProducts, setBudgetProducts] = useState<Product[]>([])
  const [loadingTarget, setLoadingTarget] = useState(false)
  const [loadingBudget, setLoadingBudget] = useState(false)
  const cartCount = useCartStore((state) => state.getTotalItems())

  const fetchGiftProducts = useCallback(async () => {
    try {
      // 모든 선물세트 상품 조회
      const { data: allData, error: allError } = await supabase
        .from('products')
        .select('*')
        .eq('category', '선물세트')
        .order('created_at', { ascending: false })
        .limit(100)

      if (allError) throw allError
      
      // 실시간 인기 선물세트로 설정된 상품만 필터링
      const featured = (allData || []).filter((product: Product) => 
        product.gift_featured === true
      )
      
      // 순서대로 정렬
      featured.sort((a: Product, b: Product) => {
        const orderA = a.gift_featured_order ?? 999999
        const orderB = b.gift_featured_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      setGiftProducts(featured.slice(0, 20))
    } catch (error) {
      console.error('선물세트 상품 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGiftProducts()
  }, [fetchGiftProducts])

  const fetchTargetProducts = useCallback(async (target: string) => {
    setLoadingTarget(true)
    try {
      console.log('선물 대상 상품 조회 시작:', target)
      
      // 모든 상품 조회 (카테고리 필터 제거하여 더 넓게 검색)
      const { data: allData, error: allError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (allError) {
        console.error('상품 조회 에러:', allError)
        throw allError
      }
      
      console.log('전체 상품 개수:', allData?.length || 0)
      
      // 선물 대상으로 필터링
      const filtered = (allData || []).filter((product: Product) => {
        const targets = Array.isArray(product.gift_target) ? product.gift_target : []
        const hasTarget = targets.includes(target)
        if (hasTarget) {
          console.log('매칭된 상품:', product.name, 'gift_target:', targets)
        }
        return hasTarget
      })
      
      console.log('필터링된 상품 개수:', filtered.length)
      
      // 순서대로 정렬
      filtered.sort((a: Product, b: Product) => {
        const orderA = a.gift_display_order ?? 999999
        const orderB = b.gift_display_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      const result = filtered.slice(0, 20)
      console.log('최종 결과 개수:', result.length)
      setTargetProducts(result)
    } catch (error) {
      console.error('선물 대상 상품 조회 실패:', error)
      setTargetProducts([])
    } finally {
      setLoadingTarget(false)
    }
  }, [])

  const fetchBudgetProducts = useCallback(async (budgetType: string) => {
    setLoadingBudget(true)
    try {
      console.log('예산별 상품 조회 시작:', budgetType)
      
      // 모든 상품 조회 (카테고리 필터 제거하여 더 넓게 검색)
      const { data: allData, error: allError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (allError) {
        console.error('상품 조회 에러:', allError)
        throw allError
      }
      
      console.log('전체 상품 개수:', allData?.length || 0)
      
      // 관리자가 설정한 예산 카테고리로 필터링
      const filtered = (allData || []).filter((product: any) => {
        const budgets = Array.isArray(product.gift_budget_targets) ? product.gift_budget_targets : []
        const hasBudget = budgets.includes(budgetType)
        if (hasBudget) {
          console.log('매칭된 상품:', product.name, 'gift_budget_targets:', budgets)
        }
        return hasBudget
      })
      
      console.log('필터링된 상품 개수:', filtered.length)
      
      // 순서대로 정렬 (gift_budget_order가 null이면 뒤로)
      filtered.sort((a: any, b: any) => {
        const orderA = a.gift_budget_order ?? 999999
        const orderB = b.gift_budget_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      const result = filtered.slice(0, 20)
      console.log('최종 결과 개수:', result.length)
      setBudgetProducts(result)
    } catch (error) {
      console.error('예산별 상품 조회 실패:', error)
      setBudgetProducts([])
    } finally {
      setLoadingBudget(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTarget) {
      fetchTargetProducts(selectedTarget)
    } else {
      setTargetProducts([])
    }
  }, [selectedTarget, fetchTargetProducts])

  useEffect(() => {
    if (selectedBudget) {
      fetchBudgetProducts(selectedBudget)
    } else {
      setBudgetProducts([])
    }
  }, [selectedBudget, fetchBudgetProducts])

  return (
    <div className="min-h-screen flex flex-col">
      {/* 선물관 전용 헤더 */}
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
          
          {/* 중앙: 제목 (absolute로 완전 중앙 배치) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              선물관
            </h1>
          </div>
          
          {/* 오른쪽: 장바구니 버튼 */}
          <div className="ml-auto flex items-center">
            <button
              onClick={() => router.push('/cart')}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span
                className={`absolute top-0 right-0 bg-blue-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
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

      <main className="flex-1 pt-4 pb-20">
        {/* 선물하기 설명서 버튼 */}
        <section className="container mx-auto px-4 mb-6">
          <button
            onClick={() => router.push('/gift/guide')}
            className="w-full px-4 py-4 bg-white rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">소중한 분께 전하는 '선물하기' 설명서</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </section>

        {/* 실시간 인기 선물세트 */}
        <section className="container mx-auto px-4 mb-8">
          <h2 className="text-lg font-semibold mb-4">실시간 인기 선물세트</h2>
          {loading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-40">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : giftProducts.length > 0 ? (
            <>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {giftProducts.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-40">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
              {/* 전체보기 버튼 */}
              <div className="mt-4">
                <Link href="/products?category=선물세트" className="block">
                  <button className="w-full px-6 py-2.5 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                    <span>전체보기</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>선물세트 상품이 없습니다.</p>
            </div>
          )}
        </section>

        {/* 선물이 고민된다면 */}
        <section className="container mx-auto px-4 mb-8">
          <h2 className="text-lg font-semibold mb-4">맞춤 선물이 고민된다면</h2>
          <div className="flex gap-2 mb-4">
            {['아이', '부모님', '연인', '친구'].map((target) => (
              <button
                key={target}
                onClick={() => setSelectedTarget(selectedTarget === target ? null : target)}
                className={`px-4 py-2.5 text-base rounded-lg font-medium transition flex-shrink-0 ${
                  selectedTarget === target
                    ? 'bg-primary-800 text-white'
                    : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
                }`}
              >
                {target}
              </button>
            ))}
          </div>
          {selectedTarget && (
            <>
              {loadingTarget ? (
                <div>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4 mb-4">
                      <div className="w-28 h-28 bg-gray-200 rounded-md animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : targetProducts.length > 0 ? (
                <div>
                  {targetProducts.map((product) => (
                    <Link key={product.id} href={`/products/${product.id}`}>
                      <div className="flex gap-4 hover:opacity-80 transition mb-4">
                        {/* 이미지 - 왼쪽 */}
                        <div className="relative w-28 h-28 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden">
                          {product.image_url && !product.image_url.includes('via.placeholder.com') ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="112px"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                              이미지
                            </div>
                          )}
                        </div>
                        {/* 텍스트 - 오른쪽 */}
                        <div className="flex-1 min-w-0">
                          {product.brand && (
                            <div className="text-sm font-semibold text-gray-600 mb-1">{product.brand}</div>
                          )}
                          <h3 className="text-base font-medium text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                          {product.discount_percent && product.discount_percent > 0 ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold text-red-600">{product.discount_percent}%</span>
                              <span className="text-lg font-bold text-gray-900">
                                {formatPrice(product.price * (1 - product.discount_percent / 100))}원
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                {formatPrice(product.price)}원
                              </span>
                            </div>
                          ) : (
                            <div className="text-lg font-bold text-gray-900">
                              {formatPrice(product.price)}원
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>{selectedTarget}에게 추천하는 선물세트가 없습니다.</p>
                </div>
              )}
            </>
          )}
        </section>

        {/* 예산에 맞는 선물을 찾는다면 */}
        <section className="container mx-auto px-4 mb-8">
          <h2 className="text-lg font-semibold mb-4">예산에 맞는 선물을 찾는다면</h2>
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
            {[
              { label: '5만원 미만', value: 'under-50k' },
              { label: '5만원 이상', value: 'over-50k' },
              { label: '10만원 이상', value: 'over-100k' },
              { label: '20만원 이상', value: 'over-200k' },
            ].map((budget) => (
              <button
                key={budget.value}
                onClick={() => setSelectedBudget(selectedBudget === budget.value ? null : budget.value)}
                className={`px-4 py-2.5 text-base rounded-lg font-medium transition flex-shrink-0 ${
                  selectedBudget === budget.value
                    ? 'bg-primary-800 text-white'
                    : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
                }`}
              >
                {budget.label}
              </button>
            ))}
          </div>
          {selectedBudget && (
            <>
              {loadingBudget ? (
                <div>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4 mb-4">
                      <div className="w-28 h-28 bg-gray-200 rounded-md animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : budgetProducts.length > 0 ? (
                <div>
                  {budgetProducts.map((product) => (
                    <Link key={product.id} href={`/products/${product.id}`}>
                      <div className="flex gap-4 hover:opacity-80 transition mb-4">
                        {/* 이미지 - 왼쪽 */}
                        <div className="relative w-28 h-28 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden">
                          {product.image_url && !product.image_url.includes('via.placeholder.com') ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="112px"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                              이미지
                            </div>
                          )}
                        </div>
                        {/* 텍스트 - 오른쪽 */}
                        <div className="flex-1 min-w-0">
                          {product.brand && (
                            <div className="text-sm font-semibold text-gray-600 mb-1">{product.brand}</div>
                          )}
                          <h3 className="text-base font-medium text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                          {product.discount_percent && product.discount_percent > 0 ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold text-red-600">{product.discount_percent}%</span>
                              <span className="text-lg font-bold text-gray-900">
                                {formatPrice(product.price * (1 - product.discount_percent / 100))}원
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                {formatPrice(product.price)}원
                              </span>
                            </div>
                          ) : (
                            <div className="text-lg font-bold text-gray-900">
                              {formatPrice(product.price)}원
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>해당 예산대의 선물세트가 없습니다.</p>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <BottomNavbar />
    </div>
  )
}

