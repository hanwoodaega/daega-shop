'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase, Product } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { addCartItemWithDB } from '@/lib/cart-db'
import { formatPrice, getPromotionRequiredCount, getPromotionPaidCount, getTotalPromoQuantity } from '@/lib/utils'
import { generatePromotionGroupId, processPromotionItems } from '@/lib/promotion-utils'
import { CartItem } from '@/lib/store'

interface PromotionModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

export default function PromotionModal({ isOpen, onClose, product }: PromotionModalProps) {
  const { user } = useAuth()
  const [promotionProducts, setPromotionProducts] = useState<Product[]>([])
  const [promoQuantities, setPromoQuantities] = useState<{[key: string]: number}>({})
  const [loading, setLoading] = useState(false)

  // 프로모션 상품 불러오기
  useEffect(() => {
    const fetchPromotionProducts = async () => {
      if (!isOpen || !product?.promotion || product.promotion.type !== 'bogo' || !product.promotion.id) {
        setPromotionProducts([])
        return
      }

      setLoading(true)
      try {
        // 같은 promotion_id를 가진 상품들 조회
        const { data: promotionProductsData, error: ppError } = await supabase
          .from('promotion_products')
          .select(`
            product_id,
            products (
              id,
              slug,
              brand,
              name,
              price,
              image_url,
              category
            )
          `)
          .eq('promotion_id', product.promotion.id)
        
        if (ppError) throw ppError
        
        // 상품 데이터 변환
        const products = (promotionProductsData || []).map((pp: any) => {
          const prod = Array.isArray(pp.products) ? pp.products[0] : pp.products
          return prod
        }).filter(Boolean)
        
        setPromotionProducts(products)
      } catch (error) {
        console.error('프로모션 상품 조회 실패:', error)
        toast.error('프로모션 상품을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchPromotionProducts()
  }, [isOpen, product?.id, product?.promotion?.id])

  // 모달 닫을 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setPromoQuantities({})
    }
  }, [isOpen])

  const updatePromoQuantity = useCallback((productId: string, change: number) => {
    if (!product?.promotion || product.promotion.type !== 'bogo') return
    
    const buyQty = product.promotion.buy_qty || 1
    const requiredCount = buyQty + 1 // 2+1이면 3개
    const currentQty = promoQuantities[productId] || 0
    const newQty = Math.max(0, currentQty + change)
    
    // 총 수량 확인
    const totalOthers = Object.entries(promoQuantities)
      .filter(([id]) => id !== productId)
      .reduce((sum, [, qty]) => sum + qty, 0)
    
    if (totalOthers + newQty > requiredCount) {
      toast.error(`최대 ${requiredCount}개까지만 선택 가능합니다`, {
        icon: '⚠️',
      })
      return
    }
    
    setPromoQuantities({
      ...promoQuantities,
      [productId]: newQty
    })
  }, [product, promoQuantities])

  const handlePromotionAdd = useCallback(() => {
    if (!product?.promotion || product.promotion.type !== 'bogo') return
    
    const buyQty = product.promotion.buy_qty || 1
    const requiredCount = buyQty + 1 // 2+1이면 3개
    const totalSelected = getTotalPromoQuantity(promoQuantities)
    
    if (totalSelected !== requiredCount) {
      toast.error(`${buyQty}+1 프로모션은 정확히 ${requiredCount}개를 선택해야 합니다\n현재: ${totalSelected}개`, {
        icon: '⚠️',
        duration: 4000,
      })
      return
    }

    // 프로모션 그룹 ID 생성
    const groupId = generatePromotionGroupId()

    // 선택한 상품들을 배열로 변환
    const selectedItems: { product: Product; quantity: number }[] = []
    Object.entries(promoQuantities).forEach(([productId, qty]) => {
      if (qty > 0) {
        const p = promotionProducts.find(p => p.id === productId)
        if (p) {
          selectedItems.push({ product: p, quantity: qty })
        }
      }
    })
    
    // 프로모션 상품 처리 (가격 정렬 + 무료 상품 결정)
    const paidCount = buyQty
    const cartItems = processPromotionItems(selectedItems, paidCount)
    
    // 각 상품을 장바구니에 추가 (같은 그룹 ID로 묶음)
    cartItems.forEach(cartItem => {
      const fullCartItem: CartItem = {
        ...cartItem,
        promotion_group_id: groupId,
        promotion_type: `${buyQty}+1` as '1+1' | '2+1' | '3+1',
        selected: true, // 기본값
      }
      addCartItemWithDB(user?.id || null, fullCartItem)
    })

    onClose()
    setPromoQuantities({})
    
    toast.success('장바구니에 추가되었습니다!', {
      icon: '🛒',
    })
  }, [product, promotionProducts, promoQuantities, user, onClose])

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => { onClose(); setPromoQuantities({}) }}></div>
      <div className="relative w-full max-w-md bg-white rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-teal-100 text-red-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">
              🎁 {product.promotion?.type === 'bogo' && product.promotion.buy_qty ? `${product.promotion.buy_qty}+1` : '프로모션'} 골라담기
            </h3>
            <button onClick={() => { onClose(); setPromoQuantities({}) }} className="text-red-600 text-2xl">×</button>
          </div>
        </div>
        
        <div className="px-5 py-3 bg-gray-50 border-b">
          <p className="text-sm text-gray-700">
            {product.promotion?.type === 'bogo' && product.promotion.buy_qty ? (
              <>
                상품을 <strong>{product.promotion.buy_qty + 1}개</strong> 담으면, 1개가 <strong>무료</strong>로 적용됩니다.
              </>
            ) : (
              <>프로모션 상품을 선택하세요.</>
            )}
          </p>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : promotionProducts.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-sm text-gray-500 text-center">프로모션 상품이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promotionProducts.map((promo) => {
                const qty = promoQuantities[promo.id] || 0
                return (
                  <div 
                    key={promo.id}
                    className={`border p-4 transition ${
                      qty > 0 ? 'border-black' : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* 왼쪽: 이미지 */}
                      <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">이미지 준비중</span>
                      </div>
                      
                      {/* 중앙: 상품명 + 가격 */}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{promo.name}</h4>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatPrice(promo.price)}원
                        </p>
                      </div>
                      
                      {/* 오른쪽: 수량 조절 */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updatePromoQuantity(promo.id, -1)}
                          className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 text-sm flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-semibold w-7 text-center text-base">
                          {qty}
                        </span>
                        <button
                          onClick={() => updatePromoQuantity(promo.id, 1)}
                          className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 text-sm flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        <div className="px-5 py-4 bg-white border-t">
          {product.promotion?.type === 'bogo' && product.promotion.buy_qty && promotionProducts.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">
                  선택: {getTotalPromoQuantity(promoQuantities)} / {product.promotion.buy_qty + 1}
                </span>
                <span className="text-xs text-gray-600">
                  {getTotalPromoQuantity(promoQuantities) < product.promotion.buy_qty + 1 && 
                    `${product.promotion.buy_qty + 1 - getTotalPromoQuantity(promoQuantities)}개 더 선택`}
                </span>
              </div>
              <button
                onClick={handlePromotionAdd}
                disabled={getTotalPromoQuantity(promoQuantities) !== product.promotion.buy_qty + 1}
                className="w-full py-3 bg-red-600 text-white rounded font-bold hover:bg-blue-950 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                장바구니에 담기
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center">
              {!product.promotion ? '프로모션 정보를 불러올 수 없습니다.' : 
               product.promotion.type !== 'bogo' ? 'BOGO 프로모션이 아닙니다.' :
               !product.promotion.buy_qty ? '프로모션 수량 정보가 없습니다.' :
               '프로모션 상품이 없습니다.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

