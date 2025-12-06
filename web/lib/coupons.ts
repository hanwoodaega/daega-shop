import { Coupon, UserCoupon } from './supabase'

/**
 * 한국 시간(KST) 기준으로 날짜를 YYYY-MM-DD 문자열로 변환
 */
function getKSTDateString(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`
}

/**
 * 쿠폰 유효기간 체크
 * 발급일(created_at)부터 validity_days만큼 유효한지 확인
 */
export function isCouponValid(userCoupon: UserCoupon, coupon: Coupon): boolean {
  if (!coupon || !coupon.is_active) return false
  
  // 현재 날짜 (KST)
  const todayStr = getKSTDateString(new Date())
  
  // 발급일 (KST)
  const issuedAt = new Date(userCoupon.created_at)
  const issuedAtKST = new Date(issuedAt.getTime() + 9 * 60 * 60 * 1000)
  
  // 유효기간 종료일 계산
  const validUntilKST = new Date(issuedAtKST)
  validUntilKST.setUTCDate(validUntilKST.getUTCDate() + coupon.validity_days)
  const validUntilStr = getKSTDateString(validUntilKST)
  
  return todayStr <= validUntilStr
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
  
  const validUntilKST = new Date(issuedAtKST)
  validUntilKST.setUTCDate(validUntilKST.getUTCDate() + coupon.validity_days)
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
 */
export async function getUserCoupons(
  userId: string,
  includeUsed: boolean = false
): Promise<UserCoupon[]> {
  try {
    // 서버 API로 쿠폰 조회
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
 * 쿠폰 지급 (서버 API 사용)
 */
export async function issueCoupon(
  userId: string,
  couponId: string,
  skipValidityCheck: boolean = false
): Promise<boolean> {
  try {
    const res = await fetch('/api/coupons/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ couponId, skipValidityCheck }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('쿠폰 지급 실패:', res.status, errorData)
      return false
    }

    return true
  } catch (error) {
    console.error('쿠폰 지급 실패:', error)
    return false
  }
}

/**
 * 첫구매 쿠폰 지급 (서버 API 사용)
 */
export async function issueFirstPurchaseCoupon(userId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/coupons/first-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('첫구매 쿠폰 지급 실패:', res.status, errorData)
      return false
    }

    return true
  } catch (error) {
    console.error('첫구매 쿠폰 지급 실패:', error)
    return false
  }
}

/**
 * 쿠폰 사용 (서버 API 사용)
 */
export async function useCoupon(
  userId: string,
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
    return { success: data.success, discountAmount: data.discountAmount || 0 }
  } catch (error) {
    console.error('쿠폰 사용 실패:', error)
    return { success: false, discountAmount: 0 }
  }
}


