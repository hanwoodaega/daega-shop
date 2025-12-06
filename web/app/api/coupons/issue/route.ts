import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// POST: 쿠폰 지급
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()
    const body = await request.json()
    const { couponId, skipValidityCheck } = body

    if (!couponId) {
      return NextResponse.json({ error: '쿠폰 ID가 필요합니다.' }, { status: 400 })
    }

    // 이미 보유한 쿠폰인지 확인
    const { data: existing } = await supabase
      .from('user_coupons')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_id', couponId)
      .eq('is_used', false)
      .single()

    if (existing) {
      return NextResponse.json({ error: '이미 보유한 쿠폰입니다.' }, { status: 400 })
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

    // 사용 횟수 제한 체크
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ error: '쿠폰 지급 한도에 도달했습니다.' }, { status: 400 })
    }

    // 쿠폰 지급
    const { data: userCoupon, error: issueError } = await supabase
      .from('user_coupons')
      .insert({
        user_id: user.id,
        coupon_id: couponId,
        is_used: false,
      })
      .select()
      .single()

    if (issueError) {
      console.error('쿠폰 지급 실패:', issueError)
      return NextResponse.json({ error: '쿠폰 지급에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, userCoupon })
  } catch (error: any) {
    console.error('쿠폰 지급 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

