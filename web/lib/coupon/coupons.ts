import { Coupon, UserCoupon } from '../supabase/supabase'

/**
 * 한국 시간(KST) 기준으로 날짜를 YYYY-MM-DD 문자열로 변환
 */
function getKSTDateString(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`
}

/**
 * 쿠폰 유효기간 체크
 * expires_at 필드를 우선 사용하고, 없으면 created_at + validity_days로 계산 (레거시 지원)
 * 이미 발급된 쿠폰은 is_active와 무관하게 만료일 기준으로 판단
 * (is_active=false는 "신규 발급 중단"을 의미하며, 기존 쿠폰 사용은 가능해야 함)
 */
export function isCouponValid(userCoupon: UserCoupon, coupon: Coupon): boolean {
  if (!coupon) return false
  if (userCoupon.is_used) return false
  
  const now = new Date()
  
  // expires_at이 있으면 그것을 사용 (서버에서 계산된 값)
  if (userCoupon.expires_at) {
    const expiresAt = new Date(userCoupon.expires_at)
    return now < expiresAt
  }
  
  // 레거시: expires_at이 없으면 created_at + validity_days로 계산
  // validity_days가 null이거나 0 이하면 유효하지 않음
  if (!coupon.validity_days || coupon.validity_days <= 0) {
    return false
  }
  
  const issuedAt = new Date(userCoupon.created_at)
  const validUntil = new Date(issuedAt)
  validUntil.setDate(validUntil.getDate() + coupon.validity_days)
  
  return now < validUntil
}

/**
 * 쿠폰 유효기간 반환 (표시용)
 */
export function getCouponValidityPeriod(userCoupon: UserCoupon, coupon: Coupon): { start: string, end: string } {
  const issuedAt = new Date(userCoupon.created_at)
  const issuedAtKST = new Date(issuedAt.getTime() + 9 * 60 * 60 * 1000)
  
  const year = issuedAtKST.getUTCFullYear()
  const month = issuedAtKST.getUTCMonth() + 1
  const day = issuedAtKST.getUTCDate()
  
  // validity_days가 null이거나 0 이하면 기본값 사용 (안전장치)
  const validityDays = coupon.validity_days && coupon.validity_days > 0 ? coupon.validity_days : 30
  
  const validUntilKST = new Date(issuedAtKST)
  validUntilKST.setUTCDate(validUntilKST.getUTCDate() + validityDays)
  const endYear = validUntilKST.getUTCFullYear()
  const endMonth = validUntilKST.getUTCMonth() + 1
  const endDay = validUntilKST.getUTCDate()
  
  return {
    start: `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`,
    end: `${endYear}.${String(endMonth).padStart(2, '0')}.${String(endDay).padStart(2, '0')}`
  }
}

/**
 * 서버 API로 사용자 보유 쿠폰 조회
 * 서버 API가 JWT 기반으로 자동으로 현재 로그인한 사용자의 쿠폰만 반환합니다.
 */
export async function getUserCoupons(
  includeUsed: boolean = false
): Promise<UserCoupon[]> {
  try {
    // 서버 API로 쿠폰 조회 (JWT로 자동 필터링됨)
    const res = await fetch(`/api/coupons?includeUsed=${includeUsed}`)
    
    if (!res.ok) {
      console.error('사용자 쿠폰 조회 실패:', res.status)
      return []
    }
    
    const data = await res.json()
    return data.coupons || []
  } catch (error) {
    console.error('사용자 쿠폰 조회 실패:', error)
    return []
  }
}

/**
 * @deprecated 일반 사용자가 직접 쿠폰을 받는 기능은 제거되었습니다.
 * 쿠폰 지급은 관리자만 할 수 있으며, /api/admin/coupons/issue를 사용해야 합니다.
 * 
 * 이 함수는 더 이상 사용하지 않습니다. 관리자 페이지에서 쿠폰을 지급하세요.
 */
export async function issueCoupon(
  userId: string,
  couponId: string
): Promise<boolean> {
  console.warn('issueCoupon() is deprecated. Use admin API instead.')
  return false
}

/**
 * 쿠폰 사용 (서버 API 사용)
 * 서버 API가 JWT 기반으로 자동으로 현재 로그인한 사용자의 쿠폰만 사용할 수 있도록 처리합니다.
 */
export async function useCoupon(
  userCouponId: string,
  orderId: string,
  purchaseAmount: number
): Promise<{ success: boolean; discountAmount: number }> {
  try {
    const res = await fetch('/api/coupons/use', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userCouponId,
        orderId,
        purchaseAmount,
      }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('쿠폰 사용 실패:', res.status, errorData)
      return { success: false, discountAmount: 0 }
    }

    const data = await res.json()
    if (data.success) {
      const { mutateProfileRelated } = await import('@/lib/swr')
      mutateProfileRelated().catch(() => {})
    }
    return { success: data.success, discountAmount: data.discountAmount || 0 }
  } catch (error) {
    console.error('쿠폰 사용 실패:', error)
    return { success: false, discountAmount: 0 }
  }
}

