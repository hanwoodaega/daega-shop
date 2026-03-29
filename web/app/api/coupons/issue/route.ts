import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { getCouponExpiresAtEndOfDayKST } from '@/lib/coupon/expires'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { couponIssuePairSchema } from '@/lib/validation/schemas/admin-coupon'

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
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const supabase = createSupabaseAdminClient()
    const parsed = await parseJsonBody(request, couponIssuePairSchema)
    if (!parsed.ok) return parsed.response

    const { couponId, userId } = parsed.data

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

    // 쿠폰 정보 확인
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
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

    // 서버에서 expires_at 계산: 발급일(KST) + validity_days 되는 날 23:59:59 KST까지
    const expiresAtISO = getCouponExpiresAtEndOfDayKST(coupon.validity_days)

    // 쿠폰 지급 (UNIQUE 제약조건 충돌 시 DO NOTHING)
    const { data: userCoupon, error: issueError } = await supabase
      .from('user_coupons')
      .insert({
        user_id: userId,
        coupon_id: couponId,
        is_used: false,
        expires_at: expiresAtISO,
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
  } catch (error: unknown) {
    return unknownErrorResponse('coupons/issue', error)
  }
}


