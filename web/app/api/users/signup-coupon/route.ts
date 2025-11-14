import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { issueFirstPurchaseCoupon } from '@/lib/coupons'

/**
 * 회원가입 시 첫구매 쿠폰 지급 API
 * 클라이언트에서 회원가입 성공 후 호출
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const success = await issueFirstPurchaseCoupon(user.id)

    if (success) {
      return NextResponse.json({ success: true, message: '첫구매 쿠폰이 지급되었습니다.' })
    } else {
      return NextResponse.json({ success: false, message: '첫구매 쿠폰이 없거나 이미 지급되었습니다.' })
    }
  } catch (error: any) {
    console.error('첫구매 쿠폰 지급 실패:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

