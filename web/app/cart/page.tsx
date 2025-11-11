'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import toast from 'react-hot-toast'
// Navbar 제거: 장바구니 전용 헤더 사용
import Footer from '@/components/Footer'
import { useCartStore, useWishlistStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { formatPrice } from '@/lib/utils'
import { supabase, Product } from '@/lib/supabase'
import { toggleWishlist } from '@/lib/wishlist-sync'
import { calculateDiscountPrice } from '@/lib/product-utils'

function CartPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, addItem, removeItem, updateQuantity, getTotalPrice, toggleSelect, toggleSelectGroup, toggleSelectAll, getSelectedItems } = useCartStore()
  const { items: wishlistIds } = useWishlistStore()
  const { user } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [defaultAddress, setDefaultAddress] = useState<any>(null)
  const [loadingAddress, setLoadingAddress] = useState(true)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [allAddresses, setAllAddresses] = useState<any[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [stockStatus, setStockStatus] = useState<{[productId: string]: number}>({})
  const [showWishlist, setShowWishlist] = useState(searchParams?.get('tab') === 'wishlist')
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([])
  const [loadingWishlist, setLoadingWishlist] = useState(false)

  const allSelected = useMemo(() => 
    items.length > 0 && items.every((item) => item.selected !== false),
    [items]
  )

  // 위시리스트 상품 불러오기
  useEffect(() => {
    const loadWishlistProducts = async () => {
      if (wishlistIds.length === 0) {
        setWishlistProducts([])
        return
      }

      setLoadingWishlist(true)
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
        setLoadingWishlist(false)
      }
    }

    loadWishlistProducts()
  }, [wishlistIds])

  // 장바구니 상품의 실시간 재고 상태 확인
  useEffect(() => {
    const checkStockStatus = async () => {
      // 찜 페이지에서는 재고 확인 안 함
      if (items.length === 0 || showWishlist) return

      const productIds = Array.from(new Set(items.map(item => item.productId)))
      
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, stock')
          .in('id', productIds)

        if (!error && data) {
          const stockMap: {[productId: string]: number} = {}
          data.forEach(p => {
            stockMap[p.id] = p.stock
          })
          setStockStatus(stockMap)
        }
      } catch (error) {
        console.error('재고 상태 확인 실패:', error)
      }
    }

    checkStockStatus()
  }, [items.length, showWishlist]) // items 대신 items.length 사용

  // 재고 상태 변경 시 품절 상품 자동 제거
  useEffect(() => {
    const outOfStockItems: {id: string, name: string}[] = []
    
    items.forEach(item => {
      const currentStock = stockStatus[item.productId]
      if (currentStock !== undefined && currentStock <= 0) {
        outOfStockItems.push({ id: item.id!, name: item.name })
      }
    })

    if (outOfStockItems.length > 0) {
      // 품절 상품 제거
      outOfStockItems.forEach(item => {
        removeItem(item.id)
      })
      
      // 상품명 목록 생성
      const productNames = outOfStockItems.map(item => item.name).join(', ')
      
      toast.error(`${productNames}이(가) 품절되어 장바구니에서 제거되었습니다.`, {
        icon: '❌',
        duration: 5000,
      })
    }
  }, [stockStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // 기본 배송지 불러오기 (장바구니 모드에서만)
  useEffect(() => {
    const loadDefaultAddress = async () => {
      // 찜 페이지에서는 배송지 불러오지 않음
      if (!user || showWishlist) {
        setLoadingAddress(false)
        return
      }

      try {
        // 기본 배송지 조회
        const { data: defaultAddr, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single()

        if (error) {
          // 기본 배송지가 없으면 첫 번째 배송지 조회
          const { data: firstAddr } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          setDefaultAddress(firstAddr || null)
        } else {
          setDefaultAddress(defaultAddr)
        }
      } catch (error) {
        console.error('배송지 조회 실패:', error)
      } finally {
        setLoadingAddress(false)
      }
    }

    loadDefaultAddress()
  }, [user?.id, showWishlist]) // user 대신 user?.id 사용

  // 모든 배송지 불러오기
  const loadAllAddresses = async () => {
    if (!user) return
    
    setLoadingAddresses(true)
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAllAddresses(data)
      }
    } catch (error) {
      console.error('배송지 목록 조회 실패:', error)
    } finally {
      setLoadingAddresses(false)
    }
  }

  // 배송지 선택 (장바구니에서만 사용, 기본 배송지 변경 없음)
  const handleSelectAddress = (addressId: string) => {
    setSelectedAddressId(addressId)
  }
  
  // 배송지 선택 확인 - 기본 배송지로 저장
  const confirmAddressSelection = async () => {
    if (!selectedAddressId || !user) {
      setShowAddressModal(false)
      setSelectedAddressId(null)
      return
    }

    try {
      // 1. 모든 배송지의 is_default를 false로 설정
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)

      // 2. 선택한 배송지를 기본 배송지로 설정
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', selectedAddressId)
        .eq('user_id', user.id)

      if (error) {
        console.error('기본 배송지 설정 실패:', error)
        toast.error('배송지 설정에 실패했습니다.')
        return
      }

      // 3. 로컬 state 업데이트
      const selected = allAddresses.find(addr => addr.id === selectedAddressId)
      if (selected) {
        setDefaultAddress({ ...selected, is_default: true })
      }

      // 4. allAddresses도 업데이트
      setAllAddresses(prev => 
        prev.map(addr => ({
          ...addr,
          is_default: addr.id === selectedAddressId
        }))
      )

    } catch (error) {
      console.error('배송지 업데이트 실패:', error)
      toast.error('배송지 설정에 실패했습니다.')
    } finally {
      setShowAddressModal(false)
      setSelectedAddressId(null)
    }
  }

  // 프로모션 삭제 감지 및 자동 처리
  useEffect(() => {
    const checkPromotions = async () => {
      const promotionGroupItems = items.filter(item => item.promotion_group_id)
      
      if (promotionGroupItems.length === 0) return

      // promotion_group_id별로 그룹화
      const groupMap = new Map<string, typeof items>()
      promotionGroupItems.forEach(item => {
        if (item.promotion_group_id) {
          if (!groupMap.has(item.promotion_group_id)) {
            groupMap.set(item.promotion_group_id, [])
          }
          groupMap.get(item.promotion_group_id)!.push(item)
        }
      })

      // 각 그룹의 첫 번째 상품 ID로 현재 프로모션 상태 확인
      for (const [groupId, groupItems] of Array.from(groupMap.entries())) {
        const productId = groupItems[0].productId
        
        try {
          const res = await fetch(`/api/products/${productId}`)
          if (res.ok) {
            const product = await res.json()
            
            // 프로모션이 삭제되었거나 변경된 경우
            if (!product.promotion_type || !product.promotion_products) {
              // 해당 그룹의 모든 상품을 일반 상품으로 변환
              removeItem(groupItems[0].id!)
              
              // 일반 상품으로 다시 추가
              groupItems.forEach(item => {
                addItem({
                  productId: item.productId,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  imageUrl: item.imageUrl,
                  discount_percent: item.discount_percent === 100 ? undefined : item.discount_percent,
                  brand: item.brand,
                })
              })
            }
          }
        } catch (error) {
          console.error('프로모션 확인 실패:', error)
        }
      }
    }

    checkPromotions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 컴포넌트 마운트 시 한 번만 실행

  // 프로모션 그룹별로 상품 묶기
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: typeof items } = {}
    const standalone: typeof items = []
    
    items.forEach(item => {
      if (item.promotion_group_id) {
        if (!groups[item.promotion_group_id]) {
          groups[item.promotion_group_id] = []
        }
        groups[item.promotion_group_id].push(item)
      } else {
        standalone.push(item)
      }
    })
    
    return { groups, standalone }
  }, [items])

  const handleCheckout = useCallback(() => {
    const selectedItems = getSelectedItems()
    if (selectedItems.length === 0) {
      toast.error('주문할 상품을 선택해주세요.', {
        icon: '📦',
      })
      return
    }
    if (!user) {
      setShowLoginPrompt(true)
      return
    }
    
    router.push('/checkout')
  }, [getSelectedItems, user, router])

  const handleGiftCheckout = useCallback(() => {
    const selectedItems = getSelectedItems()
    if (selectedItems.length === 0) {
      toast.error('주문할 상품을 선택해주세요.', {
        icon: '🎁',
      })
      return
    }
    if (!user) {
      setShowLoginPrompt(true)
      return
    }
    
    router.push('/checkout?mode=gift')
  }, [getSelectedItems, user, router])

  return (
    <div className="min-h-screen flex flex-col">
      {/* 장바구니 전용 헤더 */}
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
              {showWishlist ? '나의 찜' : '장바구니'}
            </h1>
          </div>
          
          {/* 오른쪽: 찜/장바구니 + 홈 */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setShowWishlist(!showWishlist)}
              aria-label={showWishlist ? "장바구니" : "찜 목록"}
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              {showWishlist ? (
                <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              )}
            </button>
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

      <main className="flex-1 container mx-auto px-2 pt-2 pb-32">
        {/* 위시리스트 보기 */}
        {showWishlist ? (
          <div>
            {loadingWishlist ? (
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {wishlistProducts.map((product) => {
                  const isWished = wishlistIds.includes(product.id)
                  const discountPrice = calculateDiscountPrice(product.price, product.discount_percent)
                  return (
                    <div
                      key={product.id}
                      onClick={() => router.push(`/products/${product.id}`)}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                      <div 
                        className="relative aspect-square bg-gray-200 overflow-hidden"
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                          이미지 준비중
                        </div>
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <span className="text-white text-xl font-bold">품절</span>
                          </div>
                        )}
                        {/* 장바구니 버튼 - 오른쪽 하단 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (product.stock <= 0) {
                              toast.error('품절된 상품입니다', {
                                icon: '😢',
                              })
                              return
                            }
                            addItem({
                              productId: product.id,
                              name: product.name,
                              price: product.price,
                              quantity: 1,
                              imageUrl: product.image_url,
                              discount_percent: product.discount_percent ?? undefined,
                              brand: product.brand ?? undefined,
                              stock: product.stock,
                            })
                            toast.success('장바구니에 추가되었습니다!', {
                              icon: '🛒',
                            })
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
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-bold text-primary-900 line-clamp-1 flex-1">{product.brand}</div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                const success = await toggleWishlist(product.id, false)
                                if (success) {
                                  toast.success('찜 목록에서 제거되었습니다', {
                                    icon: '💔',
                                  })
                                }
                              }}
                              className="ml-2 p-1 hover:scale-110 transition-transform flex-shrink-0"
                              aria-label="찜 해제"
                            >
                              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                            </button>
                          </div>
                        )}
                        <h3 className="text-sm font-medium mb-2 line-clamp-2">{product.name}</h3>
                        {product.discount_percent && product.discount_percent > 0 ? (
                          <>
                            <div className="text-xs text-gray-500 line-through">
                              {formatPrice(product.price)}원
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold text-red-600">{product.discount_percent}%</span>
                              <span className="text-base font-bold text-gray-900">
                                {formatPrice(discountPrice)}원
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-base font-bold text-gray-900">
                            {formatPrice(product.price)}원
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <>
        {/* 배송지 정보 */}
        {!loadingAddress && user && items.length > 0 && (
          <div className="mb-3 bg-white rounded-lg px-3 py-2">
            {defaultAddress ? (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900">{defaultAddress.name}</h3>
                    {defaultAddress.is_default && (
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">기본</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {defaultAddress.address}
                    {defaultAddress.address_detail && ` ${defaultAddress.address_detail}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    loadAllAddresses()
                    setSelectedAddressId(defaultAddress.id)
                    setShowAddressModal(true)
                  }}
                  className="ml-4 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition whitespace-nowrap"
                >
                  배송지 변경
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">등록된 배송지가 없습니다</p>
                <button
                  onClick={() => router.push('/profile/addresses')}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary-800 rounded-md hover:bg-primary-900 transition"
                >
                  배송지 등록
                </button>
              </div>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-xl text-gray-600 mb-6">장바구니가 비어있습니다.</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-primary-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-900 transition"
            >
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 장바구니 아이템 */}
            <div className="lg:col-span-2">
              {/* 전체 선택 체크박스 */}
              <div className="pt-0 pb-4 border-b border-gray-300">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="w-6 h-6 text-primary-800 border-gray-300 rounded focus:ring-primary-800"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">전체 선택</span>
                </label>
              </div>

              {/* 프로모션 그룹 표시 */}
              {Object.entries(groupedItems.groups).map(([groupId, groupItems]) => {
                const groupSelected = groupItems.every(item => item.selected !== false)
                return (
                  <div key={groupId} className="py-6 border-b border-gray-200">
                    {/* 프로모션 그룹 헤더 */}
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={groupSelected}
                          onChange={() => toggleSelectGroup(groupId)}
                          className="w-5 h-5 text-primary-800 border-gray-300 rounded focus:ring-primary-800"
                        />
                        <span className="text-sm font-bold text-red-700">
                          🎁 {groupItems[0].promotion_type || '1+1'} 프로모션
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(groupItems[0].id!)}
                        className="text-red-600 hover:text-red-700 text-xs font-medium"
                      >
                        삭제
                      </button>
                    </div>
                  
                  {/* 그룹 내 상품들 */}
                  {groupItems.map((item) => {
                    return (
                    <div key={item.id} className="py-3">
                      <div className="flex items-start space-x-3">
                        {/* 상품 이미지 */}
                        <div className="relative w-24 h-24 bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 text-xs">
                          이미지 준비중
                        </div>

                        {/* 상품 정보 */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-2">
                              {item.brand && (
                                <div className="text-sm font-bold text-gray-900 mb-0.5">{item.brand}</div>
                              )}
                              <h3 className="text-sm font-normal mb-1">{item.name}</h3>
                            </div>
                          </div>

                          <div className="flex-1">
                            {item.discount_percent === 100 ? (
                              <>
                                <div className="text-sm text-gray-500 line-through">
                                  {formatPrice(item.price)}원
                                </div>
                                <div className="text-lg font-bold text-red-600">
                                  0원
                                </div>
                              </>
                            ) : (
                              <div className="text-lg font-bold text-gray-900">
                                {formatPrice(item.price)}원
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    )
                  })}
                  
                  {/* 그룹 수량 조절 - 하단에 배치 */}
                  <div className="mt-2 flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        const currentQty = groupItems[0].quantity
                        groupItems.forEach(item => {
                          updateQuantity(item.id!, Math.max(1, currentQty - 1))
                        })
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 text-xs"
                    >
                      -
                    </button>
                    <span className="font-semibold w-6 text-center text-base">
                      {groupItems[0].quantity}
                    </span>
                    <button
                      onClick={() => {
                        const currentQty = groupItems[0].quantity
                        groupItems.forEach(item => {
                          updateQuantity(item.id!, currentQty + 1)
                        })
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
                )
              })}

              {/* 일반 상품 표시 */}
              {groupedItems.standalone.map((item, index) => (
                <div key={item.id} className={`py-6 border-b border-gray-200 ${index === groupedItems.standalone.length - 1 && Object.keys(groupedItems.groups).length === 0 ? 'border-b-0' : ''}`}>
                  <div className="flex items-start space-x-3">
                    {/* 상품 이미지 (각진 모서리, 크기 약간 축소) */}
                    <div className="relative w-24 h-24 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                      {/* 체크박스 - 이미지 왼쪽 상단 */}
                      <div className="absolute top-0 left-0 z-10">
                        <input
                          type="checkbox"
                          checked={item.selected !== false}
                          onChange={() => toggleSelect(item.id!)}
                          className="w-6 h-6 text-primary-800 border-gray-300 rounded focus:ring-primary-800 bg-white"
                        />
                      </div>
                      <span className="text-gray-500 text-xs">이미지 준비중</span>
                    </div>

                    {/* 상품 정보 */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          {item.brand && (
                            <div className="text-sm font-bold text-gray-900 mb-0.5 line-clamp-1">{item.brand}</div>
                          )}
                          <h3 className="text-sm font-normal mb-1 line-clamp-2">{item.name}</h3>
                        </div>
                        <button
                          onClick={() => removeItem(item.id!)}
                          className="text-red-600 hover:text-red-700 text-xs flex-shrink-0"
                        >
                          삭제
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {item.discount_percent && item.discount_percent > 0 ? (
                            <>
                              <div className="text-xs text-gray-500 line-through mt-1">
                                {formatPrice(item.price * item.quantity)}원
                              </div>
                              <div className="flex items-baseline gap-2 mt-0">
                                <span className="text-base md:text-lg font-bold text-red-600">{item.discount_percent}%</span>
                                <span className="text-lg md:text-xl font-extrabold text-gray-900">
                                  {formatPrice(Math.round(item.price * (100 - item.discount_percent) / 100) * item.quantity)}
                                </span>
                                <span className="text-gray-600 text-sm">원</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="invisible h-2 leading-none">.</div>
                              <div className="flex items-baseline gap-1 mt-0">
                                <span className="text-lg md:text-xl font-bold text-gray-900">
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                                <span className="text-gray-600 text-sm">원</span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id!, Math.max(1, item.quantity - 1))}
                            className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 text-xs"
                          >
                            -
                          </button>
                          <span className="font-semibold w-6 text-center text-base">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id!, item.quantity + 1)}
                            className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>
              ))}

              
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4">주문 요약</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">상품 금액</span>
                    <span className="font-semibold">{formatPrice(getTotalPrice())}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">배송비</span>
                    <span className="font-semibold">
                      {getTotalPrice() >= 50000 ? '무료' : '3,000원'}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-primary-900">
                        {formatPrice(getTotalPrice() + (getTotalPrice() >= 50000 ? 0 : 3000))}원
                      </span>
                    </div>
                  </div>
                </div>

                {getTotalPrice() < 50000 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
                    {formatPrice(50000 - getTotalPrice())}원 더 담으면 무료배송!
                  </div>
                )}

                <button
                  onClick={() => router.push('/products')}
                  className="w-full mt-3 bg-primary-800 text-white py-3 rounded-lg font-semibold hover:bg-primary-900 transition"
                >
                  쇼핑 계속하기
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* 하단 고정 액션 바: 선물하기 / 주문하기 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="px-0 pb-6 grid grid-cols-2 gap-0">
          <button
            onClick={handleGiftCheckout}
            className="bg-gray-900 text-white py-3 text-lg font-semibold hover:bg-gray-800"
          >
            선물하기
          </button>
          <button
            onClick={handleCheckout}
            className="bg-red-600 text-white py-3 text-lg font-semibold hover:bg-red-700"
          >
            주문하기
          </button>
        </div>
      </div>

      <div className="pb-20">
        <Footer />
      </div>

      {/* 배송지 선택 모달 */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => {
            setShowAddressModal(false)
            setSelectedAddressId(null)
          }}></div>
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-primary-800 text-white px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">배송지 선택</h3>
                <button onClick={() => {
                  setShowAddressModal(false)
                  setSelectedAddressId(null)
                }} className="text-white text-2xl">×</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAddresses ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800 mx-auto"></div>
                </div>
              ) : allAddresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">등록된 배송지가 없습니다</p>
                  <button
                    onClick={() => {
                      setShowAddressModal(false)
                      router.push('/profile/addresses')
                    }}
                    className="px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900"
                  >
                    배송지 등록하기
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {allAddresses.map((address) => (
                    <div
                      key={address.id}
                      onClick={() => handleSelectAddress(address.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        selectedAddressId === address.id
                          ? 'border-primary-800 bg-primary-50'
                          : 'border-gray-300 hover:border-primary-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-900">{address.name}</h4>
                        {address.is_default && (
                          <span className="text-xs bg-primary-800 text-white px-2 py-0.5 rounded">기본</span>
                        )}
                        {selectedAddressId === address.id && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">선택됨</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        {address.address}
                        {address.address_detail && ` ${address.address_detail}`}
                      </p>
                      {address.recipient_phone && (
                        <p className="text-sm text-gray-600">
                          {address.recipient_name} · {address.recipient_phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 bg-gray-50 border-t flex gap-2">
              <button
                onClick={() => {
                  setShowAddressModal(false)
                  setSelectedAddressId(null)
                  router.push('/profile/addresses')
                }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                배송지 관리
              </button>
              <button
                onClick={confirmAddressSelection}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-800 rounded-lg hover:bg-primary-900"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 로그인 유도 모달 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowLoginPrompt(false)}></div>
          <div className="relative w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl p-5">
            <div className="text-base font-medium mb-2">로그인이 필요합니다.</div>
            <div className="text-sm text-gray-600 mb-5">주문을 계속하시려면 로그인해 주세요.</div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowLoginPrompt(false)} className="py-3 rounded-lg border">취소</button>
              <button onClick={() => router.push(`/auth/login?next=${encodeURIComponent('/checkout')}`)} className="py-3 rounded-lg bg-primary-800 text-white font-semibold">로그인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  )
}

