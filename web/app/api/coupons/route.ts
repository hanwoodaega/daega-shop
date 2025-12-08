import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'
import { Coupon, UserCoupon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * 개발 환경에서만 로그 출력
 */
function devLog(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}

function devWarn(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args)
  }
}

/**
 * 쿠폰 만료 여부 체크
 * 이미 발급된 쿠폰은 expires_at만으로 판단 (발급 시점에 정해진 만료일이 진짜 만료일)
 * 쿠폰 정책 변경(is_active 등)과 무관하게 유효해야 함
 */
function isCouponExpired(userCoupon: UserCoupon, coupon: Coupon | null): boolean {
  if (userCoupon.is_used) return false // 사용된 쿠폰은 만료 체크 불필요
  
  const now = new Date()
  
  // expires_at이 있으면 그것을 사용 (서버에서 계산된 값)
  if (userCoupon.expires_at) {
    const expiresAt = new Date(userCoupon.expires_at)
    return now > expiresAt
  }
  
  // 레거시: expires_at이 없으면 created_at + validity_days로 계산
  if (!coupon || !coupon.validity_days || coupon.validity_days <= 0) {
    return true // validity_days가 없으면 만료로 간주
  }
  
  const issuedAt = new Date(userCoupon.created_at)
  const validUntil = new Date(issuedAt)
  validUntil.setDate(validUntil.getDate() + coupon.validity_days)
  
  return now > validUntil
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
    // LEFT JOIN을 사용하여 쿠폰 정보가 없어도 user_coupons는 조회되도록 함
    let query = supabase
      .from('user_coupons')
      .select(`
        *,
        coupon:coupons!left (*)
      `)
      .eq('user_id', user.id)

    if (!includeUsed) {
      query = query.eq('is_used', false)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('사용자 쿠폰 조회 실패:', error)
      return NextResponse.json({ 
        error: '쿠폰 조회 실패',
        details: error.message || '알 수 없는 오류'
      }, { status: 500 })
    }

    // 디버깅: 조회된 데이터 확인
    devLog(`쿠폰 조회 성공: user_id=${user.id}, count=${data?.length || 0}`)
    if (data) {
      data.forEach((uc: UserCoupon) => {
        devLog(`  - user_coupon_id=${uc.id}, coupon_id=${uc.coupon_id}, is_used=${uc.is_used}, expires_at=${uc.expires_at}, coupon=${uc.coupon ? 'exists' : 'missing'}`)
      })
    }

    // 쿠폰 필터링
    // 조건:
    // - includeUsed=false: is_used=false이고 만료되지 않은 쿠폰만
    // - includeUsed=true: 모든 쿠폰 표시 (사용됨, 만료됨 포함)
    // - is_active=false: 표시 (이미 받은 쿠폰은 사용 가능해야 함)
    // - is_deleted=true: 숨김 (관리자가 완전 삭제한 쿠폰)
    const filteredCoupons = (data || []).filter((uc: UserCoupon) => {
      const coupon = uc.coupon as Coupon | null
      
      // 쿠폰 정보가 없으면 제외 (쿠폰이 삭제되었거나 RLS 정책 문제)
      if (!coupon) {
        devWarn(`[쿠폰 조회] 쿠폰 정보 없음: user_coupon_id=${uc.id}, coupon_id=${uc.coupon_id}, user_id=${user.id}`)
        return false
      }
      
      // 쿠폰이 삭제되었으면 제외 (soft delete - 관리자가 완전 삭제)
      if (coupon.is_deleted) {
        devWarn(`[쿠폰 조회] 삭제된 쿠폰: user_coupon_id=${uc.id}, coupon_id=${uc.coupon_id}, coupon_name=${coupon.name}`)
        return false
      }
      
      // is_active=false는 표시 (이미 받은 쿠폰은 사용 가능해야 함)
      // 비활성화는 "신규 발급 중단"이지 "기존 쿠폰 사용 금지"가 아님
      
      // includeUsed에 따른 필터링
      if (!includeUsed) {
        // 사용 가능한 쿠폰만 표시
        if (uc.is_used) return false
        if (isCouponExpired(uc, coupon)) return false
      }
      // includeUsed=true면 모든 쿠폰 표시 (사용됨, 만료됨 포함)
      
      return true
    })

    return NextResponse.json({ 
      coupons: filteredCoupons,
      // 디버깅 정보 (개발 환경에서만)
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          total: data?.length || 0,
          returned: filteredCoupons.length,
          excluded: (data?.length || 0) - filteredCoupons.length
        }
      })
    })
  } catch (error: any) {
    console.error('쿠폰 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

