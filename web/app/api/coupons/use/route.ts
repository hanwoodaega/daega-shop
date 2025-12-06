import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// POST: 쿠폰 사용
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

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

    // 활성화 여부 체크
    if (!coupon.is_active) {
      return NextResponse.json({ error: '비활성화된 쿠폰입니다.' }, { status: 400 })
    }

    // 유효기간 체크 - 발급일(created_at)부터 validity_days만큼 유효
    const todayStr = new Date().toISOString().split('T')[0]
    const issuedAt = new Date(userCoupon.created_at)
    const validUntil = new Date(issuedAt)
    validUntil.setDate(validUntil.getDate() + coupon.validity_days)
    const validUntilStr = validUntil.toISOString().split('T')[0]

    if (todayStr > validUntilStr) {
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

    // 쿠폰 사용 횟수 증가
    const { error: countError } = await supabase
      .from('coupons')
      .update({
        usage_count: coupon.usage_count + 1,
      })
      .eq('id', coupon.id)

    if (countError) {
      console.error('쿠폰 사용 횟수 증가 실패:', countError)
      // 쿠폰 사용은 이미 처리되었으므로 경고만 로그
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

