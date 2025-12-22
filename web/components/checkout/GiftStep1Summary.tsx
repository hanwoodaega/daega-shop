'use client'

import { formatPrice } from '@/lib/utils/utils'

interface GiftStep1SummaryProps {
  items: any[]
  originalTotal: number
  discountAmount: number
  finalTotal: number
  shipping: number
}

export function GiftStep1Summary({
  items,
  originalTotal,
  discountAmount,
  finalTotal,
  shipping,
}: GiftStep1SummaryProps) {
  // 프로모션 그룹별로 상품 묶기
  const groupedItems = items.reduce((acc, item) => {
    if (item.promotion_group_id) {
      if (!acc.groups[item.promotion_group_id]) {
        acc.groups[item.promotion_group_id] = []
      }
      acc.groups[item.promotion_group_id].push(item)
    } else {
      acc.standalone.push(item)
    }
    return acc
  }, { groups: {} as { [key: string]: typeof items }, standalone: [] as typeof items })

  // 같은 상품(productId)을 합치는 함수
  const mergeSameProducts = (itemList: typeof items) => {
    type ItemType = typeof items[0]
    const merged = itemList.reduce((acc: { [key: string]: ItemType }, item: ItemType) => {
      const key = item.productId
      if (acc[key]) {
        acc[key].quantity += item.quantity
      } else {
        acc[key] = { ...item }
      }
      return acc
    }, {} as { [key: string]: ItemType })
    return Object.values(merged) as ItemType[]
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold mb-4">선물요약</h2>
      <div className="space-y-3">
        {/* 프로모션 그룹 상품들 */}
        {Object.entries(groupedItems.groups).flatMap(([groupId, groupItems]) => {
          const mergedGroupItems = mergeSameProducts(groupItems as typeof items)
          return mergedGroupItems.map((item, itemIndex) => (
            <div 
              key={`${item.productId}-${itemIndex}`} 
              className="pb-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {item.brand && (
                    <div className="text-base font-semibold text-gray-900 mb-0.5">{item.brand}</div>
                  )}
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
                </div>
                <div className="text-base font-semibold text-gray-900 ml-4">x{item.quantity}</div>
              </div>
            </div>
          ))
        })}
        
        {/* 일반 상품들 */}
        {(() => {
          const mergedStandalone = mergeSameProducts(groupedItems.standalone)
          return mergedStandalone.map((item, index) => (
            <div 
              key={`${item.productId}-${index}`} 
              className="pb-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {item.brand && (
                    <div className="text-base font-semibold text-gray-900 mb-0.5">{item.brand}</div>
                  )}
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
                </div>
                <div className="text-base font-semibold text-gray-900 ml-4">x{item.quantity}</div>
              </div>
            </div>
          ))
        })()}
      </div>
      {/* 총가격 */}
      <div className="mt-6 pt-4 border-t border-gray-300 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">상품 금액</span>
          <span className="font-semibold">{formatPrice(originalTotal)}원</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">즉시할인</span>
            <span className="font-semibold text-red-600">-{formatPrice(discountAmount)}원</span>
          </div>
        )}
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg font-bold">
            <span>결제 예상 금액</span>
            <span className="text-primary-900">{formatPrice(finalTotal + shipping)}원</span>
          </div>
        </div>
      </div>
    </div>
  )
}

