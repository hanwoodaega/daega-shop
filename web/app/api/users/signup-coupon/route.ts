import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'

/**
 * @deprecated 첫구매 쿠폰은 이제 DB Trigger로 자동 발급됩니다.
 * users 테이블에 INSERT가 발생하면 자동으로 첫구매 쿠폰이 발급됩니다.
 * 
 * 이 API를 호출할 필요가 없습니다. 회원가입 시 자동으로 처리됩니다.
 * 
 * @see migrations/first_purchase_coupon_trigger.sql
 */
// POST: 회원가입 시 첫구매 쿠폰 지급 (Deprecated - DB Trigger로 대체됨)
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // Trigger가 이미 처리했을 가능성이 높음
    // 사용자가 이미 쿠폰을 받았는지 확인 (정보 제공용)
    // Trigger 정책과 일치: 가장 최근 첫구매 쿠폰만 조회
    const { data: firstPurchaseCoupons } = await supabase
      .from('coupons')
      .select('id')
      .eq('is_first_purchase_only', true)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!firstPurchaseCoupons || firstPurchaseCoupons.length === 0) {
      return NextResponse.json({ success: false, message: '첫구매 쿠폰이 없습니다.' })
    }

    const { data: userCoupon } = await supabase
      .from('user_coupons')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_id', firstPurchaseCoupons[0].id)
      .limit(1)
      .single()

    if (userCoupon) {
      return NextResponse.json({
        success: true,
        message: '첫구매 쿠폰이 이미 발급되었습니다. (Trigger가 자동 처리)',
      })
    }

    // Trigger가 곧 처리할 것이므로 성공 응답
    return NextResponse.json({
      success: true,
      message: '첫구매 쿠폰은 회원가입 시 자동으로 발급됩니다. 잠시 후 쿠폰함을 확인해주세요.',
    })
  } catch (error: any) {
    console.error('첫구매 쿠폰 조회 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

