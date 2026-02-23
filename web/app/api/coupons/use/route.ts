import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// POST: 쿠폰 사용
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const supabase = createSupabaseServerClient()
    const body = await request.json()
    const { userCouponId, orderId, purchaseAmount } = body

    if (!userCouponId || !orderId || purchaseAmount === undefined) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }

    // 사용자 쿠폰 조회
    const { data: userCoupon, error: ucError } = await supabase
      .from('user_coupons')
      .select(`
        *,
        coupon:coupons (*)
      `)
      .eq('id', userCouponId)
      .eq('user_id', user.id)
      .eq('is_used', false)
      .single()

    if (ucError || !userCoupon) {
      return NextResponse.json({ error: '사용 가능한 쿠폰을 찾을 수 없습니다.' }, { status: 404 })
    }

    const coupon = userCoupon.coupon as any

    // 쿠폰 정보가 없으면 제외 (쿠폰이 삭제되었거나 RLS 정책 문제)
    if (!coupon) {
      return NextResponse.json({ error: '쿠폰을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 쿠폰이 삭제되었으면 제외 (soft delete)
    if (coupon.is_deleted) {
      return NextResponse.json({ error: '삭제된 쿠폰입니다.' }, { status: 400 })
    }

    // 활성화 여부 체크
    if (!coupon.is_active) {
      return NextResponse.json({ error: '비활성화된 쿠폰입니다.' }, { status: 400 })
    }

    // 유효기간 체크 - expires_at 필드 우선 사용 (서버에서 계산된 값)
    const now = new Date()
    let isExpired = false
    
    if (userCoupon.expires_at) {
      // expires_at이 있으면 그것을 사용
      const expiresAt = new Date(userCoupon.expires_at)
      isExpired = now > expiresAt
    } else {
      // 레거시: expires_at이 없으면 created_at + validity_days로 계산
      const issuedAt = new Date(userCoupon.created_at)
      const validUntil = new Date(issuedAt)
      validUntil.setDate(validUntil.getDate() + coupon.validity_days)
      isExpired = now > validUntil
    }

    if (isExpired) {
      return NextResponse.json({ error: '만료된 쿠폰입니다.' }, { status: 400 })
    }

    // 최소 구매 금액 체크
    if (coupon.min_purchase_amount && purchaseAmount < coupon.min_purchase_amount) {
      return NextResponse.json({ 
        error: `최소 구매 금액 ${coupon.min_purchase_amount}원 이상이어야 합니다.` 
      }, { status: 400 })
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

    if (useError) {
      console.error('쿠폰 사용 처리 실패:', useError)
      return NextResponse.json({ error: '쿠폰 사용 처리에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, discountAmount })
  } catch (error: any) {
    console.error('쿠폰 사용 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}


