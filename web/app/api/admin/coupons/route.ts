import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
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

    const supabase = createSupabaseServerClient()

    // 쿠폰 목록 조회
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
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

    const supabase = createSupabaseServerClient()
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
      usage_limit,
      is_first_purchase_only,
    } = body

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
        usage_limit: usage_limit ? parseInt(usage_limit) : null,
        usage_count: 0,
        is_first_purchase_only: is_first_purchase_only || false,
      })
      .select()
      .single()

    if (error) {
      console.error('쿠폰 생성 실패:', error)
      return NextResponse.json({ error: '쿠폰 생성 실패' }, { status: 500 })
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

