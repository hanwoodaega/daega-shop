// 주문 관련 유틸리티 함수

export function getStatusText(status: string, deliveryType?: string): string {
  // 픽업의 경우 다른 상태 텍스트 사용
  if (deliveryType === 'pickup') {
    switch (status) {
      case 'pending':
        return '결제대기'
      case 'ORDER_RECEIVED':
        return '주문완료'
      case 'PREPARING':
        return '상품준비중'
      case 'IN_TRANSIT':
        return '상품준비중'
      case 'DELIVERED':
        return '완료'
      case 'CONFIRMED':
        return '구매확정'
      case 'gift_received':
        return '선물수령'
    case 'cancelled':
      return '주문취소'
    case 'payment_error':
      return '결제검증오류'
    default:
        return status
    }
  }
  
  // 택배배송의 경우
  switch (status) {
    case 'pending':
      return '결제대기'
    case 'ORDER_RECEIVED':
      return '주문완료'
    case 'PREPARING':
      return '상품준비중'
    case 'IN_TRANSIT':
      return '배송중'
    case 'DELIVERED':
      return '배송완료'
    case 'CONFIRMED':
      return '구매확정'
    case 'gift_received':
      return '선물수령'
    case 'cancelled':
      return '주문취소'
    case 'payment_error':
      return '결제검증오류'
    // 하위 호환성을 위한 기존 상태
    case 'paid':
      return '주문완료'
    case 'shipped':
      return '배송중'
    case 'delivered':
      return '배송완료'
    default:
      return status
  }
}

export function getDeliveryTypeText(deliveryType: string): string {
  switch (deliveryType) {
    case 'pickup':
      return '픽업'
    case 'regular':
    case 'quick':
      return '택배배송'
    default:
      return deliveryType
  }
}

/** 주문 카드용 배송 일시 표기 (예: 3.9(월) 07:30) */
export function formatOrderDeliveryDisplay(
  createdAt: string,
  deliveryTime?: string | null,
  status?: string
): string {
  const d = new Date(createdAt)
  const month = d.getMonth() + 1
  const date = d.getDate()
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const day = dayNames[d.getDay()]
  const timePart = deliveryTime && /^\d{1,2}:\d{2}/.test(deliveryTime)
    ? deliveryTime.match(/^\d{1,2}:\d{2}/)?.[0] ?? ''
    : ''
  if (timePart) {
    return `${month}.${date}(${day}) ${timePart}`
  }
  return `${month}.${date}(${day})`
}

/**
 * 주문 항목을 정규화하여 중복 주문 방지에 사용
 * 제품 ID, 수량, 가격 기준으로 정렬하여 일관된 핑거프린트 생성
 */
export interface OrderItem {
  productId?: string | number
  quantity?: number
  price?: number
}

export function normalizeOrderItems(items: OrderItem[]): OrderItem[] {
  if (!Array.isArray(items)) return []
  
  // 제품 ID, 수량, 가격 기준 정렬 후 직렬화
  const sorted = [...items].map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
  })).sort((a, b) => {
    if (a.productId !== b.productId) return (Number(a.productId) || 0) - (Number(b.productId) || 0)
    if (a.price !== b.price) return (Number(a.price) || 0) - (Number(b.price) || 0)
    return (Number(a.quantity) || 0) - (Number(b.quantity) || 0)
  })
  
  return sorted
}

/**
 * 주문 상태에 따른 텍스트 색상 클래스 반환
 */
export function getStatusTextColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-600'
    case 'ORDER_RECEIVED':
      return 'text-blue-600'
    case 'PREPARING':
      return 'text-purple-600'
    case 'IN_TRANSIT':
      return 'text-cyan-600'
    case 'DELIVERED':
    case 'CONFIRMED':
      return 'text-green-600'
    case 'cancelled':
      return 'text-red-600'
    case 'payment_error':
      return 'text-red-600'
    // 하위 호환성
    case 'paid':
      return 'text-blue-600'
    case 'shipped':
      return 'text-cyan-600'
    case 'delivered':
      return 'text-green-600'
    default:
      return 'text-gray-600'
  }
}

/**
 * 주문 상태에 따른 배경 색상 클래스 반환
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'ORDER_RECEIVED':
      return 'bg-blue-100 text-red-600'
    case 'PREPARING':
      return 'bg-purple-100 text-purple-800'
    case 'IN_TRANSIT':
      return 'bg-cyan-100 text-cyan-800'
    case 'DELIVERED':
    case 'CONFIRMED':
    case 'gift_received':
      return 'bg-green-100 text-green-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    case 'payment_error':
      return 'bg-red-100 text-red-800'
    // 하위 호환성
    case 'paid':
      return 'bg-blue-100 text-red-600'
    case 'shipped':
      return 'bg-cyan-100 text-cyan-800'
    case 'delivered':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * 환불 상태 텍스트 반환
 */
export function getRefundStatusText(refundStatus?: string | null): string {
  if (!refundStatus) return ''
  
  switch (refundStatus) {
    case 'pending':
      return '환불 대기'
    case 'processing':
      return '환불 처리 중'
    case 'completed':
      return '환불 완료'
    default:
      return refundStatus
  }
}

