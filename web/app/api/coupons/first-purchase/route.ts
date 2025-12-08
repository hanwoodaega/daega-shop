import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/**
 * @deprecated 첫구매 쿠폰은 이제 DB Trigger로 자동 발급됩니다.
 * users 테이블에 INSERT가 발생하면 자동으로 첫구매 쿠폰이 발급됩니다.
 * 
 * 이 API는 레거시 지원을 위해 유지되지만, 실제 발급은 Trigger가 처리합니다.
 * Trigger가 이미 중복 발급을 방지하므로, 이 API는 단순히 상태 확인만 수행합니다.
 * 
 * @see migrations/first_purchase_coupon_trigger.sql
 */
// POST: 첫구매 쿠폰 지급 (Deprecated - DB Trigger로 대체됨)
export async function POST(request: NextRequest) {
  try {
    // 인증 체크
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()

    // 첫구매 쿠폰 존재 여부 확인 (사용자 안내용)
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('id')
      .eq('is_first_purchase_only', true)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .limit(1)

    if (error) {
      console.error('첫구매 쿠폰 조회 실패:', error)
      return NextResponse.json({ error: '첫구매 쿠폰 조회에 실패했습니다.' }, { status: 500 })
    }

    if (!coupons || coupons.length === 0) {
      return NextResponse.json({ error: '첫구매 쿠폰이 없습니다.' }, { status: 404 })
    }

    // Trigger가 이미 처리했을 가능성이 높음
    // 사용자가 이미 받았는지 확인 (선택적 - 정보 제공용)
    const { data: userCoupon } = await supabase
      .from('user_coupons')
      .select('id, coupon_id, created_at')
      .eq('user_id', user.id)
      .eq('coupon_id', coupons[0].id)
      .limit(1)
      .single()

    if (userCoupon) {
      return NextResponse.json({
        success: true,
        message: '첫구매 쿠폰이 이미 발급되었습니다.',
        userCoupon,
      })
    }

    // Trigger가 아직 처리하지 않았을 수 있음 (회원가입 직후 호출한 경우)
    // 하지만 Trigger가 곧 처리할 것이므로 성공 응답
    return NextResponse.json({
      success: true,
      message: '첫구매 쿠폰은 회원가입 시 자동으로 발급됩니다. 잠시 후 쿠폰함을 확인해주세요.',
    })
  } catch (error: any) {
    console.error('첫구매 쿠폰 조회 오류:', error)
    return NextResponse.json({
      error: '서버 오류',
      details: error?.message || '알 수 없는 오류',
    }, { status: 500 })
  }
}

