import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { assertAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET: 쿠폰 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 확인
    try {
      assertAdmin()
    } catch (e: any) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    // 쿠폰 목록 조회 (삭제되지 않은 쿠폰만)
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_deleted', false)  // soft delete 필터링
      .order('created_at', { ascending: false })

    if (error) {
      console.error('쿠폰 조회 실패:', error)
      return NextResponse.json({ error: '쿠폰 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ coupons: data || [] })
  } catch (error: any) {
    console.error('쿠폰 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// POST: 쿠폰 생성
export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인
    try {
      assertAdmin()
    } catch (e: any) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await request.json()

    const {
      name,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      validity_days,
      is_active,
      is_first_purchase_only,
    } = body

    // 서버 사이드 검증: validity_days는 1 이상이어야 함
    if (!validity_days || validity_days < 1 || validity_days > 365) {
      return NextResponse.json({ 
        error: '유효 기간은 1일 이상 365일 이하여야 합니다.' 
      }, { status: 400 })
    }

    // 서버 사이드 검증: discount_value는 양수여야 함
    if (!discount_value || discount_value <= 0) {
      return NextResponse.json({ 
        error: '할인 금액/율은 0보다 커야 합니다.' 
      }, { status: 400 })
    }

    // 서버 사이드 검증: percentage 타입일 때 max_discount_amount 필수
    if (discount_type === 'percentage' && (!max_discount_amount || max_discount_amount <= 0)) {
      return NextResponse.json({ 
        error: '할인율 쿠폰은 최대 할인 금액을 입력해야 합니다.' 
      }, { status: 400 })
    }

    // 쿠폰 생성
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        name,
        description: description || null,
        discount_type,
        discount_value,
        min_purchase_amount: min_purchase_amount > 0 ? min_purchase_amount : null,
        max_discount_amount: max_discount_amount > 0 ? max_discount_amount : null,
        validity_days,
        is_active: is_active !== false,
        is_first_purchase_only: is_first_purchase_only || false,
        is_deleted: false,  // 새로 생성되는 쿠폰은 삭제되지 않음
      })
      .select()
      .single()

    if (error) {
      console.error('쿠폰 생성 실패:', error)
      return NextResponse.json({ 
        error: '쿠폰 생성 실패',
        details: error.message || '알 수 없는 오류'
      }, { status: 500 })
    }

    return NextResponse.json({ coupon: data })
  } catch (error: any) {
    console.error('쿠폰 생성 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

