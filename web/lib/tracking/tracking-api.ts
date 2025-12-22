/**
 * 택배사 배송조회 API 연동
 */

export type TrackingCompany = 'CJ대한통운' | '한진택배' | '로젠택배' | '롯데택배' | '우체국택배' | '쿠팡' | '기타'

export type TrackingStatus = 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED'

interface TrackingResponse {
  status: TrackingStatus
  message?: string
}

/**
 * 택배사별 배송 상태 조회
 * 실제 API 연동은 각 택배사 API 문서에 따라 구현 필요
 */
export async function getTrackingStatus(
  company: string,
  trackingNumber: string
): Promise<TrackingResponse | null> {
  try {
    // TODO: 실제 택배사 API 연동
    // 각 택배사별로 다른 API를 사용하므로 통합 서비스나 개별 API 연동 필요
    
    // 예시: CJ대한통운 API 연동
    if (company === 'CJ대한통운') {
      // CJ대한통운 API 호출
      // const response = await fetch(`https://api.cjlogistics.com/tracking/${trackingNumber}`)
      // return parseCJTrackingResponse(response)
    }
    
    // 예시: 한진택배 API 연동
    if (company === '한진택배') {
      // 한진택배 API 호출
      // const response = await fetch(`https://api.hanjin.co.kr/tracking/${trackingNumber}`)
      // return parseHanjinTrackingResponse(response)
    }
    
    // 임시로 null 반환 (API 연동 전까지)
    // 실제 구현 시에는 각 택배사 API를 호출하여 상태를 파싱하여 반환
    return null
  } catch (error) {
    console.error('배송조회 API 오류:', error)
    return null
  }
}

/**
 * 배송 상태를 주문 상태로 매핑
 */
export function mapTrackingStatusToOrderStatus(trackingStatus: TrackingStatus): string {
  switch (trackingStatus) {
    case 'IN_TRANSIT':
      return 'IN_TRANSIT'
    case 'OUT_FOR_DELIVERY':
      return 'OUT_FOR_DELIVERY'
    case 'DELIVERED':
      return 'DELIVERED'
    default:
      return 'IN_TRANSIT'
  }
}

