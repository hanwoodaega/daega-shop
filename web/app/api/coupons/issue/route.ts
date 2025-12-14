import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { assertAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * @deprecated 이 API는 관리자 전용으로 변경되었습니다.
 * 일반 사용자 쿠폰 지급은 /api/admin/coupons/issue를 사용하세요.
 * 
 * 보안: 일반 사용자가 아무 쿠폰이나 가져갈 수 있는 취약점을 방지하기 위해
 * 관리자 인증이 필수입니다.
 */
// POST: 쿠폰 지급 (관리자 전용)
export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 필수
    assertAdmin()

    const supabase = createSupabaseAdminClient()
    const body = await request.json()
    const { couponId, userId } = body

    if (!couponId) {
      return NextResponse.json({ error: '쿠폰 ID가 필요합니다.' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }

    // 중복 발급 방지: 같은 쿠폰은 평생 딱 한번만 받을 수 있음 (사용 여부와 관계없이)
    const { count: existingCount } = await supabase
      .from('user_coupons')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('coupon_id', couponId)
      // 사용 여부와 관계없이 한 번 받은 적이 있으면 재발급 금지

    if (existingCount && existingCount > 0) {
      return NextResponse.json({ error: '이미 받은 쿠폰입니다. 같은 쿠폰은 평생 1번만 받을 수 있습니다.' }, { status: 400 })
    }

    // 쿠폰 정보 확인 (삭제되지 않은 쿠폰만)
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .eq('is_deleted', false)  // soft delete 필터링
      .single()

    if (couponError || !coupon) {
      return NextResponse.json({ error: '쿠폰을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 활성화 여부 체크
    if (!coupon.is_active) {
      return NextResponse.json({ error: '비활성화된 쿠폰입니다.' }, { status: 400 })
    }

    // validity_days 검증 (null이거나 0 이하면 에러)
    if (!coupon.validity_days || coupon.validity_days <= 0) {
      return NextResponse.json(
        { error: '잘못된 쿠폰 설정입니다. (유효기간)' },
        { status: 500 }
      )
    }

    // 서버에서 expires_at 계산 (발급일 + validity_days)
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + coupon.validity_days)

    // 쿠폰 지급 (UNIQUE 제약조건 충돌 시 DO NOTHING)
    const { data: userCoupon, error: issueError } = await supabase
      .from('user_coupons')
      .insert({
        user_id: userId,
        coupon_id: couponId,
        is_used: false,
        expires_at: expiresAt.toISOString(),  // 서버에서 계산한 만료일
      })
      .select()
      .single()

    if (issueError) {
      // UNIQUE 제약조건 충돌은 정상적인 경우 (이미 받은 쿠폰)
      if (issueError.code === '23505') {
        return NextResponse.json({ error: '이미 받은 쿠폰입니다.' }, { status: 400 })
      }
      console.error('쿠폰 지급 실패:', issueError)
      return NextResponse.json({ error: '쿠폰 지급에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, userCoupon })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    console.error('쿠폰 지급 오류:', error)
    return NextResponse.json({
      error: '서버 오류',
      details: error?.message || '알 수 없는 오류',
    }, { status: 500 })
  }
}


