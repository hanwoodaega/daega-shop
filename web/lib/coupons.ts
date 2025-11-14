import { supabase, Coupon, UserCoupon } from './supabase'

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
 * 쿠폰 조회 (사용 가능한 쿠폰만)
 * 유효기간은 발급 시점에 결정되므로 여기서는 활성화 여부만 확인
 */
export async function getAvailableCoupons(userId?: string): Promise<Coupon[]> {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 사용 횟수 제한 체크
    const availableCoupons = (data || []).filter((coupon: Coupon) => {
      if (coupon.usage_limit === null || coupon.usage_limit === undefined) return true
      return coupon.usage_count < coupon.usage_limit
    })

    return availableCoupons
  } catch (error) {
    console.error('쿠폰 조회 실패:', error)
    return []
  }
}

/**
 * 사용자 보유 쿠폰 조회
 */
export async function getUserCoupons(
  userId: string,
  includeUsed: boolean = false
): Promise<UserCoupon[]> {
  try {
    let query = supabase
      .from('user_coupons')
      .select(`
        *,
        coupon:coupons (*)
      `)
      .eq('user_id', userId)

    if (!includeUsed) {
      query = query.eq('is_used', false)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // 유효기간 체크 - 발급일(created_at)부터 validity_days만큼 유효
    const validCoupons = (data || []).filter((uc: UserCoupon) => {
      if (uc.is_used) return includeUsed
      const coupon = uc.coupon as Coupon
      return isCouponValid(uc, coupon)
    })

    return validCoupons
  } catch (error) {
    console.error('사용자 쿠폰 조회 실패:', error)
    return []
  }
}

/**
 * 쿠폰 지급
 */
export async function issueCoupon(
  userId: string,
  couponId: string,
  skipValidityCheck: boolean = false
): Promise<boolean> {
  try {
    // 이미 보유한 쿠폰인지 확인
    const { data: existing } = await supabase
      .from('user_coupons')
      .select('id')
      .eq('user_id', userId)
      .eq('coupon_id', couponId)
      .eq('is_used', false)
      .single()

    if (existing) {
      // 이미 보유한 쿠폰
      return false
    }

    // 쿠폰 정보 확인
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single()

    if (couponError || !coupon) {
      return false
    }

    // 활성화 여부 체크
    if (!coupon.is_active) {
      return false
    }

    // 유효기간 체크는 지급 시점에 하지 않음 (발급일부터 validity_days만큼 유효)
    // skipValidityCheck 파라미터는 더 이상 사용하지 않지만 호환성을 위해 유지

    // 사용 횟수 제한 체크
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return false
    }

    // 쿠폰 지급
    const { error: issueError } = await supabase
      .from('user_coupons')
      .insert({
        user_id: userId,
        coupon_id: couponId,
        is_used: false,
      })

    if (issueError) throw issueError

    return true
  } catch (error) {
    console.error('쿠폰 지급 실패:', error)
    return false
  }
}

/**
 * 첫구매 쿠폰 지급
 */
export async function issueFirstPurchaseCoupon(userId: string): Promise<boolean> {
  try {
    // 관리자가 지정한 첫구매 쿠폰 조회 (is_first_purchase_only = true이고 is_active = true인 쿠폰)
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_first_purchase_only', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    if (!coupons || coupons.length === 0) {
      // 첫구매 쿠폰이 없으면 지급하지 않음
      return false
    }

    const firstPurchaseCoupon = coupons[0]

    // 쿠폰 지급 (유효기간은 발급일부터 validity_days만큼)
    return await issueCoupon(userId, firstPurchaseCoupon.id)
  } catch (error) {
    console.error('첫구매 쿠폰 지급 실패:', error)
    return false
  }
}

/**
 * 쿠폰 사용
 */
export async function useCoupon(
  userId: string,
  userCouponId: string,
  orderId: string,
  purchaseAmount: number
): Promise<{ success: boolean; discountAmount: number }> {
  try {
    // 사용자 쿠폰 조회
    const { data: userCoupon, error: ucError } = await supabase
      .from('user_coupons')
      .select(`
        *,
        coupon:coupons (*)
      `)
      .eq('id', userCouponId)
      .eq('user_id', userId)
      .eq('is_used', false)
      .single()

    if (ucError || !userCoupon) {
      return { success: false, discountAmount: 0 }
    }

    const coupon = userCoupon.coupon as Coupon

    // 활성화 여부 체크
    if (!coupon.is_active) {
      return { success: false, discountAmount: 0 }
    }

    // 유효기간 체크 - 발급일(created_at)부터 validity_days만큼 유효
    if (!isCouponValid(userCoupon, coupon)) {
      return { success: false, discountAmount: 0 }
    }

    // 최소 구매 금액 체크
    if (coupon.min_purchase_amount && purchaseAmount < coupon.min_purchase_amount) {
      return { success: false, discountAmount: 0 }
    }

    // 할인 금액 계산
    let discountAmount = 0
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.floor(purchaseAmount * (coupon.discount_value / 100))
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, coupon.max_discount_amount)
      }
    } else {
      discountAmount = coupon.discount_value
    }

    // 쿠폰 사용 처리
    const { error: useError } = await supabase
      .from('user_coupons')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        order_id: orderId,
      })
      .eq('id', userCouponId)

    if (useError) throw useError

    // 쿠폰 사용 횟수 증가
    const { error: countError } = await supabase
      .from('coupons')
      .update({
        usage_count: coupon.usage_count + 1,
      })
      .eq('id', coupon.id)

    if (countError) throw countError

    return { success: true, discountAmount }
  } catch (error) {
    console.error('쿠폰 사용 실패:', error)
    return { success: false, discountAmount: 0 }
  }
}

/**
 * 쿠폰 생성 (관리자용)
 */
export async function createCoupon(coupon: Omit<Coupon, 'id' | 'usage_count' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        ...coupon,
        usage_count: 0,
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  } catch (error) {
    console.error('쿠폰 생성 실패:', error)
    return null
  }
}

/**
 * 쿠폰 수정 (관리자용)
 */
export async function updateCoupon(
  couponId: string,
  updates: Partial<Coupon>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('coupons')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', couponId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('쿠폰 수정 실패:', error)
    return false
  }
}

/**
 * 쿠폰 삭제 (관리자용)
 */
export async function deleteCoupon(couponId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', couponId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('쿠폰 삭제 실패:', error)
    return false
  }
}

