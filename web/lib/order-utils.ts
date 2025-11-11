// 주문 관련 유틸리티 함수

export function getStatusText(status: string, deliveryType?: string): string {
  // 픽업의 경우 다른 상태 텍스트 사용
  if (deliveryType === 'pickup') {
    switch (status) {
      case 'pending':
        return '결제 대기'
      case 'paid':
        return '결제 완료'
      case 'shipped':
        return '준비 중'
      case 'delivered':
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
    case 'paid':
      return '결제 완료'
    case 'shipped':
      return '배송 중'
    case 'delivered':
      return '배송 완료'
    case 'cancelled':
      return '주문 취소'
    default:
      return status
  }
}

export function getDeliveryTypeText(deliveryType: string): string {
  switch (deliveryType) {
    case 'pickup':
      return '매장 픽업'
    case 'quick':
      return '퀵배달'
    case 'regular':
      return '택배배달'
    default:
      return deliveryType
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-50'
    case 'paid':
      return 'text-blue-600 bg-blue-50'
    case 'shipped':
      return 'text-purple-600 bg-purple-50'
    case 'delivered':
      return 'text-green-600 bg-green-50'
    case 'cancelled':
      return 'text-red-600 bg-red-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

export function getRefundStatusText(refundStatus?: string | null): string | null {
  switch (refundStatus) {
    case 'pending':
      return '환불 대기'
    case 'processing':
      return '환불 처리중'
    case 'completed':
      return '환불 완료'
    default:
      return null
  }
}



