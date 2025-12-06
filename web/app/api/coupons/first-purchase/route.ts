import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// POST: 첫구매 쿠폰 지급
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()

    // 관리자가 지정한 첫구매 쿠폰 조회 (is_first_purchase_only = true이고 is_active = true인 쿠폰)
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_first_purchase_only', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('첫구매 쿠폰 조회 실패:', error)
      return NextResponse.json({ error: '첫구매 쿠폰 조회에 실패했습니다.' }, { status: 500 })
    }

    if (!coupons || coupons.length === 0) {
      return NextResponse.json({ error: '첫구매 쿠폰이 없습니다.' }, { status: 404 })
    }

    const firstPurchaseCoupon = coupons[0]

    // 이미 보유한 쿠폰인지 확인
    const { data: existing } = await supabase
      .from('user_coupons')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_id', firstPurchaseCoupon.id)
      .eq('is_used', false)
      .single()

    if (existing) {
      return NextResponse.json({ error: '이미 보유한 쿠폰입니다.' }, { status: 400 })
    }

    // 사용 횟수 제한 체크
    if (firstPurchaseCoupon.usage_limit !== null && firstPurchaseCoupon.usage_count >= firstPurchaseCoupon.usage_limit) {
      return NextResponse.json({ error: '쿠폰 지급 한도에 도달했습니다.' }, { status: 400 })
    }

    // 쿠폰 지급
    const { data: userCoupon, error: issueError } = await supabase
      .from('user_coupons')
      .insert({
        user_id: user.id,
        coupon_id: firstPurchaseCoupon.id,
        is_used: false,
      })
      .select()
      .single()

    if (issueError) {
      console.error('첫구매 쿠폰 지급 실패:', issueError)
      return NextResponse.json({ error: '첫구매 쿠폰 지급에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, userCoupon })
  } catch (error: any) {
    console.error('첫구매 쿠폰 지급 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

