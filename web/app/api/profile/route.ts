import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { Coupon, UserCoupon } from '@/lib/supabase/supabase'

export const dynamic = 'force-dynamic'

/**
 * 한국 시간(KST) 기준으로 날짜를 YYYY-MM-DD 문자열로 변환
 */
function getKSTDateString(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`
}

/**
 * 쿠폰 유효기간 체크
 * expires_at 필드를 우선 사용하고, 없으면 created_at + validity_days로 계산
 * 이미 발급된 쿠폰은 is_active와 무관하게 만료일 기준으로 판단
 */
function isCouponValid(userCoupon: UserCoupon, coupon: Coupon): boolean {
  if (!coupon) return false
  if (userCoupon.is_used) return false
  
  const now = new Date()
  
  // expires_at이 있으면 그것을 사용 (서버에서 계산된 값)
  if (userCoupon.expires_at) {
    const expiresAt = new Date(userCoupon.expires_at)
    return now <= expiresAt
  }
  
  // 레거시: expires_at이 없으면 created_at + validity_days로 계산
  // validity_days가 null이거나 0 이하면 유효하지 않음
  if (!coupon.validity_days || coupon.validity_days <= 0) {
    return false
  }
  
  const issuedAt = new Date(userCoupon.created_at)
  const validUntil = new Date(issuedAt)
  validUntil.setDate(validUntil.getDate() + coupon.validity_days)
  
  return now <= validUntil
}

// GET: 마이페이지 데이터 조회 (사용자 이름, 주문 개수, 쿠폰 개수)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 사용자 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()

    // 주문 개수 조회
    const { count: orderCount, error: orderError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // 쿠폰 조회 (쿠폰 정보도 함께 가져와서 유효기간 체크)
    const { data: userCoupons, error: couponError } = await supabase
      .from('user_coupons')
      .select(`
        *,
        coupon:coupons (*)
      `)
      .eq('user_id', user.id)
      .eq('is_used', false)

    // 유효기간 체크하여 유효한 쿠폰만 카운트
    let validCouponCount = 0
    if (userCoupons && !couponError) {
      validCouponCount = userCoupons.filter((uc: UserCoupon) => {
        const coupon = uc.coupon as Coupon
        return isCouponValid(uc, coupon)
      }).length
    }

    // 에러가 있어도 기본값 반환
    return NextResponse.json({
      name: userData?.name || null,
      orderCount: orderCount || 0,
      couponCount: validCouponCount,
      errors: {
        user: userError?.message || null,
        order: orderError?.message || null,
        coupon: couponError?.message || null,
      }
    })
  } catch (error: any) {
    console.error('마이페이지 데이터 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류',
      name: null,
      orderCount: 0,
      couponCount: 0
    }, { status: 500 })
  }
}

