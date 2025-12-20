'use client'

import Link from 'next/link'
import { CartItem } from '@/lib/store'
import { formatPrice } from '@/lib/utils'
import { isSoldOut } from '@/lib/product-utils'

interface GroupedItems {
  groups: { [key: string]: CartItem[] }
  standalone: CartItem[]
  soldOutItems: CartItem[]
}

interface CartItemListProps {
  groupedItems: GroupedItems
  userId: string | null | undefined
  onToggleSelect: (itemId: string) => void
  onToggleSelectGroup: (groupId: string) => void
  onRemoveItem: (userId: string | null, itemId: string, promotionGroupId?: string) => void
  onUpdateQuantity: (userId: string | null, itemId: string, quantity: number) => void
}

export function CartItemList({ 
  groupedItems, 
  userId, 
  onToggleSelect, 
  onToggleSelectGroup,
  onRemoveItem,
  onUpdateQuantity,
}: CartItemListProps) {
  return (
    <>
      {/* 프로모션 그룹 표시 */}
      {Object.entries(groupedItems.groups).map(([groupId, groupItems]) => {
        const groupSelected = groupItems.every(item => item.selected !== false)
        return (
          <div key={groupId} className="py-3 border-b border-gray-300">
            {/* 프로모션 그룹 헤더 - 체크박스와 삭제 버튼 */}
            <div className="mb-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={groupSelected}
                  onChange={() => onToggleSelectGroup(groupId)}
                  className="w-5 h-5 border-gray-300 focus:ring-red-600 accent-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ accentColor: '#dc2626' }}
                />
                <span className="text-base font-medium text-gray-900">
                  {groupItems[0].promotion_type || '2+1'} 적용
                </span>
              </div>
              <button
                onClick={() => onRemoveItem(userId || null, groupItems[0].id!, groupItems[0].promotion_group_id)}
                className="text-gray-700 hover:text-gray-900 p-1"
                aria-label="삭제"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 그룹 내 상품들 */}
            {groupItems.map((item, itemIndex) => {
              return (
                <div key={item.id} className={`${itemIndex === 0 ? 'pt-1' : 'pt-3'} pb-3 ${itemIndex < groupItems.length - 1 ? 'border-dashed-long' : ''}`}>
                  <div className="flex items-start space-x-3">
                    {/* 상품 이미지 */}
                    <Link href={`/product/${item.slug || item.productId}`} className="relative w-24 h-24 bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 text-xs hover:opacity-80 transition">
                      이미지 준비중
                    </Link>

                    {/* 상품 정보 */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <Link href={`/product/${item.slug || item.productId}`} className="flex-1 pr-2 hover:opacity-80 transition">
                          {item.brand && (
                            <div className="text-sm font-bold text-gray-900 mb-0.5">{item.brand}</div>
                          )}
                          <h3 className="text-sm font-normal mb-1">{item.name}</h3>
                        </Link>
                      </div>

                      <div className="flex-1">
                        {item.discount_percent === 100 ? (
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-500 line-through">
                              {formatPrice(item.price)}원
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              0원
                            </div>
                          </div>
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
            <div className="mt-0.5 flex items-center justify-end">
              <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white">
                <button
                  onClick={() => {
                    const currentQty = groupItems[0].quantity
                    const newQty = Math.max(1, currentQty - 1)
                    groupItems.forEach(item => {
                      onUpdateQuantity(userId || null, item.id!, newQty)
                    })
                  }}
                  className="w-7 h-6 hover:bg-gray-100 flex items-center justify-center border-r border-gray-300"
                >
                  <span className="text-xl leading-none -mt-0.5">-</span>
                </button>
                <span className="w-8 text-center text-sm font-medium">
                  {groupItems[0].quantity}
                </span>
                <button
                  onClick={() => {
                    const currentQty = groupItems[0].quantity
                    const newQty = currentQty + 1
                    groupItems.forEach(item => {
                      onUpdateQuantity(userId || null, item.id!, newQty)
                    })
                  }}
                  className="w-7 h-6 hover:bg-gray-100 flex items-center justify-center border-l border-gray-300"
                >
                  <span className="text-xl leading-none -mt-0.5">+</span>
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* 일반 상품 표시 */}
      {groupedItems.standalone.map((item, index) => {
        const itemSoldOut = isSoldOut(item.status)
        return (
          <div key={item.id} className={`py-6 ${index < groupedItems.standalone.length - 1 || Object.keys(groupedItems.groups).length > 0 ? 'border-b border-gray-300' : ''}`}>
            <div className="flex items-start space-x-3">
              {/* 상품 이미지 */}
              <div className="relative w-24 h-24 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                {/* 체크박스 - 이미지 왼쪽 상단 (품절 상품은 제거) */}
                {!itemSoldOut && (
                  <div 
                    className="absolute top-0 left-0 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected !== false}
                      onChange={(e) => {
                        e.stopPropagation()
                        onToggleSelect(item.id!)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 border-gray-300 focus:ring-red-600 bg-white accent-red-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ accentColor: '#dc2626' }}
                    />
                  </div>
                )}
                <Link href={`/products/${item.slug || item.productId}`} className="absolute inset-0 flex items-center justify-center hover:opacity-80 transition">
                  <span className="text-gray-500 text-xs">이미지 준비중</span>
                </Link>
                {/* 품절 오버레이 */}
                {itemSoldOut && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center z-20">
                    <span className="text-white text-xl font-bold">품절</span>
                  </div>
                )}
              </div>

              {/* 상품 정보 */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <Link href={`/product/${item.slug || item.productId}`} className="flex-1 pr-2 hover:opacity-80 transition">
                    {item.brand && (
                      <div className="text-sm font-bold text-gray-900 mb-0.5 line-clamp-1">{item.brand}</div>
                    )}
                    <h3 className="text-sm font-normal mb-1 line-clamp-2">{item.name}</h3>
                  </Link>
                  <button
                    onClick={() => onRemoveItem(userId || null, item.id!)}
                    className="text-gray-700 hover:text-gray-900 p-1 flex-shrink-0"
                    aria-label="삭제"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
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
                  <div className="flex flex-col items-end">
                    <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white">
                      <button
                        onClick={() => onUpdateQuantity(userId || null, item.id!, Math.max(1, item.quantity - 1))}
                        className="w-7 h-6 hover:bg-gray-100 flex items-center justify-center border-r border-gray-300"
                      >
                        <span className="text-xl leading-none -mt-0.5">-</span>
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(userId || null, item.id!, item.quantity + 1)}
                        className="w-7 h-6 hover:bg-gray-100 flex items-center justify-center border-l border-gray-300"
                      >
                        <span className="text-xl leading-none -mt-0.5">+</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      
      {/* 품절 상품 표시 (제일 밑) */}
      {groupedItems.soldOutItems.length > 0 && (
        <>
          <div className="py-4 border-t-2 border-gray-300"></div>
          {groupedItems.soldOutItems.map((item, index) => (
            <div key={item.id} className={`py-6 ${index < groupedItems.soldOutItems.length - 1 ? 'border-b border-gray-300' : ''}`}>
              <div className="flex items-start space-x-3">
                {/* 상품 이미지 (품절 오버레이) */}
                <div className="relative w-24 h-24 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                  <Link href={`/product/${item.slug || item.productId}`} className="absolute inset-0 flex items-center justify-center hover:opacity-80 transition">
                    <span className="text-gray-500 text-xs">이미지 준비중</span>
                  </Link>
                  {/* 품절 오버레이 */}
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center z-20">
                    <span className="text-white text-xl font-bold">품절</span>
                  </div>
                </div>

                {/* 상품 정보 */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <Link href={`/product/${item.slug || item.productId}`} className="flex-1 pr-2 hover:opacity-80 transition">
                      {item.brand && (
                        <div className="text-sm font-bold text-gray-900 mb-0.5 line-clamp-1">{item.brand}</div>
                      )}
                      <h3 className="text-sm font-normal mb-1 line-clamp-2">{item.name}</h3>
                    </Link>
                    <button
                      onClick={() => onRemoveItem(userId || null, item.id!)}
                      className="text-gray-700 hover:text-gray-900 p-1 flex-shrink-0"
                      aria-label="삭제"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

