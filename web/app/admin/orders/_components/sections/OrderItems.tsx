import { Order } from '../../_types'
import { formatPrice } from '@/lib/utils/utils'

interface OrderItemsProps {
  order: Order
}

function hideImageOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

export default function OrderItems({ order }: OrderItemsProps) {
  if (!order.order_items || order.order_items.length === 0) return null

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-3">상품 ({order.order_items.length})</h3>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-base text-left table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-3 font-medium text-gray-700 w-[28%] min-w-0">상품명</th>
              <th className="py-3 px-2 font-medium text-gray-700 text-center w-14 whitespace-nowrap">수량</th>
              <th className="py-3 px-2 font-medium text-gray-700 text-right w-24 whitespace-nowrap">판매가</th>
              <th className="py-3 px-2 font-medium text-gray-700 text-right w-20 whitespace-nowrap">할인</th>
              <th className="py-3 px-3 font-medium text-gray-700 text-right w-28 whitespace-nowrap">할인적용금액</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item) => {
              const unitPrice = (item.product as any)?.price ?? item.price ?? 0
              const appliedPrice = item.price ?? 0
              const discountPerUnit = unitPrice - appliedPrice
              const discountTotal = discountPerUnit * item.quantity
              const appliedTotal = appliedPrice * item.quantity
              return (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 px-3 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.product?.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={hideImageOnError}
                          />
                        ) : null}
                      </div>
                      <span className="font-medium text-gray-900 truncate">{item.product?.name || '상품'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center text-gray-700 whitespace-nowrap">{item.quantity}</td>
                  <td className="py-3 px-2 text-right text-gray-700 whitespace-nowrap">{formatPrice(unitPrice)}원</td>
                  <td className="py-3 px-2 text-right text-gray-700 whitespace-nowrap">
                    {discountTotal > 0 ? `${formatPrice(discountTotal)}원` : '0원'}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatPrice(appliedTotal)}원</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

