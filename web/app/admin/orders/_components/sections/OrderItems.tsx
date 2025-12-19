import { Order } from '../../_types'
import { formatPrice } from '@/lib/utils'

interface OrderItemsProps {
  order: Order
}

export default function OrderItems({ order }: OrderItemsProps) {
  if (!order.order_items || order.order_items.length === 0) return null

  return (
    <div className="mb-4 pb-4 border-b">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">주문상품</h3>
      <div className="space-y-2">
        {order.order_items.map((item) => {
          const originalPrice = (item.product as any)?.price || item.price || 0
          const orderedPrice = item.price || 0
          const hasDiscount = originalPrice > orderedPrice
          
          return (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex-1">
                <span className="text-gray-700">
                  {item.product?.name || '상품'} × {item.quantity}
                </span>
              </div>
              <div className="text-right">
                {hasDiscount ? (
                  <>
                    <div className="text-gray-400 line-through text-xs">
                      {formatPrice(originalPrice * item.quantity)}원
                    </div>
                    <div className="text-gray-900 font-medium">
                      {formatPrice(orderedPrice * item.quantity)}원
                    </div>
                  </>
                ) : (
                  <div className="text-gray-900 font-medium">
                    {formatPrice(orderedPrice * item.quantity)}원
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

