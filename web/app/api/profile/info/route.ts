import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'
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

// GET: 마이페이지 전체 정보 조회 (이름, 주문 개수, 쿠폰 개수, 포인트)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인 (헬퍼 함수 사용)
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    // 모든 데이터를 병렬로 조회
    const [userDataResult, orderCountResult, couponDataResult, pointsResult] = await Promise.allSettled([
      // 사용자 정보 조회
      supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single(),
      
      // 주문 개수 조회 (head: true로 count만 가져오기 - 성능 최적화)
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      // 쿠폰 조회 (쿠폰 정보도 함께 가져와서 유효기간 체크)
      supabase
        .from('user_coupons')
        .select(`
          *,
          coupon:coupons (*)
        `)
        .eq('user_id', user.id)
        .eq('is_used', false),
      
      // 포인트 조회
      supabase
        .from('user_points')
        .select('total_points')
        .eq('user_id', user.id)
        .single()
    ])

    // 결과 처리
    const userData = userDataResult.status === 'fulfilled' ? userDataResult.value : { data: null, error: null }
    const orderCount = orderCountResult.status === 'fulfilled' ? orderCountResult.value : { count: 0, error: null }
    const couponData = couponDataResult.status === 'fulfilled' ? couponDataResult.value : { data: null, error: null }
    const pointsData = pointsResult.status === 'fulfilled' ? pointsResult.value : { data: null, error: null }

    // 쿠폰 유효기간 체크하여 유효한 쿠폰만 카운트
    let validCouponCount = 0
    if (couponData.data && !couponData.error) {
      validCouponCount = couponData.data.filter((uc: UserCoupon) => {
        const coupon = uc.coupon as Coupon
        return isCouponValid(uc, coupon)
      }).length
    }

    // 포인트 처리 (레코드가 없으면 0으로 처리)
    let points = 0
    if (pointsData.data) {
      points = pointsData.data.total_points || 0
    } else if (pointsData.error?.code === 'PGRST116') {
      points = 0
    }

    return NextResponse.json({
      name: userData.data?.name || null,
      orders_count: orderCount.count || 0,
      coupons_count: validCouponCount,
      points: points,
      errors: {
        user: userData.error?.message || null,
        order: orderCount.error?.message || null,
        coupon: couponData.error?.message || null,
        points: pointsData.error?.message || null,
      }
    })
  } catch (error: any) {
    console.error('마이페이지 정보 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류',
      name: null,
      orders_count: 0,
      coupons_count: 0,
      points: 0
    }, { status: 500 })
  }
}

