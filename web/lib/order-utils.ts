// 주문 관련 유틸리티 함수

export function getStatusText(status: string, deliveryType?: string): string {
  // 픽업의 경우 다른 상태 텍스트 사용
  if (deliveryType === 'pickup') {
    switch (status) {
      case 'pending':
        return '결제 대기'
      case 'ORDER_RECEIVED':
        return '주문완료'
      case 'PREPARING':
        return '준비 중'
      case 'IN_TRANSIT':
        return '준비 중'
      case 'DELIVERED':
        return '완료'
      case 'cancelled':
        return '주문 취소'
      default:
        return status
    }
  }
  
  // 택배배달, 퀵배달의 경우
  switch (status) {
    case 'pending':
      return '결제 대기'
    case 'ORDER_RECEIVED':
      return '주문완료'
    case 'PREPARING':
      return '상품준비중'
    case 'IN_TRANSIT':
      return '배송중'
    case 'DELIVERED':
      return '배송완료'
    case 'cancelled':
      return '주문 취소'
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
    case 'quick':
      return '퀵배송'
    case 'regular':
      return '택배배송'
    default:
      return deliveryType
  }
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
      return 'text-green-600'
    case 'cancelled':
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
      return 'bg-green-100 text-green-800'
    case 'cancelled':
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
