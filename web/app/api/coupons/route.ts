import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'
import { Coupon, UserCoupon } from '@/lib/supabase'

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
 * 발급일(created_at)부터 validity_days만큼 유효한지 확인
 */
function isCouponValid(userCoupon: UserCoupon, coupon: Coupon): boolean {
  if (!coupon || !coupon.is_active) return false
  
  // 현재 날짜 (KST)
  const todayStr = getKSTDateString(new Date())
  
  // 발급일 (KST)
  const issuedAt = new Date(userCoupon.created_at)
  const issuedAtKST = new Date(issuedAt.getTime() + 9 * 60 * 60 * 1000)
  
  // 유효기간 종료일 계산
  const validUntilKST = new Date(issuedAtKST)
  validUntilKST.setUTCDate(validUntilKST.getUTCDate() + coupon.validity_days)
  const validUntilStr = getKSTDateString(validUntilKST)
  
  return todayStr <= validUntilStr
}

// GET: 사용자 쿠폰 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeUsed = searchParams.get('includeUsed') === 'true'

    // 사용자 쿠폰 조회
    let query = supabase
      .from('user_coupons')
      .select(`
        *,
        coupon:coupons (*)
      `)
      .eq('user_id', user.id)

    if (!includeUsed) {
      query = query.eq('is_used', false)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('사용자 쿠폰 조회 실패:', error)
      return NextResponse.json({ error: '쿠폰 조회 실패' }, { status: 500 })
    }

    // 유효기간 체크하여 필터링
    const validCoupons = (data || []).filter((uc: UserCoupon) => {
      if (uc.is_used) return includeUsed
      const coupon = uc.coupon as Coupon
      return isCouponValid(uc, coupon)
    })

    return NextResponse.json({ coupons: validCoupons })
  } catch (error: any) {
    console.error('쿠폰 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

