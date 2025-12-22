import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { assertAdmin } from '@/lib/auth/admin-auth'

export const dynamic = 'force-dynamic'

// PUT: 쿠폰 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (validity_days !== undefined && (validity_days < 1 || validity_days > 365)) {
      return NextResponse.json({ 
        error: '유효 기간은 1일 이상 365일 이하여야 합니다.' 
      }, { status: 400 })
    }

    // 서버 사이드 검증: discount_value는 양수여야 함
    if (discount_value !== undefined && discount_value <= 0) {
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

    // 쿠폰 수정
    const { data, error } = await supabase
      .from('coupons')
      .update({
        name,
        description: description || null,
        discount_type,
        discount_value,
        min_purchase_amount: min_purchase_amount > 0 ? min_purchase_amount : null,
        max_discount_amount: max_discount_amount > 0 ? max_discount_amount : null,
        validity_days,
        is_active,
        is_first_purchase_only: is_first_purchase_only || false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('쿠폰 수정 실패:', error)
      return NextResponse.json({ 
        error: '쿠폰 수정 실패',
        details: error.message || '알 수 없는 오류'
      }, { status: 500 })
    }

    return NextResponse.json({ coupon: data })
  } catch (error: any) {
    console.error('쿠폰 수정 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// DELETE: 쿠폰 삭제 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 관리자 인증 확인
    try {
      assertAdmin()
    } catch (e: any) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    // 쿠폰 존재 여부 확인
    const { data: existingCoupon, error: fetchError } = await supabase
      .from('coupons')
      .select('id, is_deleted')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingCoupon) {
      return NextResponse.json({ 
        error: '쿠폰을 찾을 수 없습니다.' 
      }, { status: 404 })
    }

    if (existingCoupon.is_deleted) {
      return NextResponse.json({ 
        error: '이미 삭제된 쿠폰입니다.' 
      }, { status: 400 })
    }

    // soft delete: is_active=false, is_deleted=true로 설정
    const { data, error } = await supabase
      .from('coupons')
      .update({
        is_active: false,
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('쿠폰 삭제 실패:', error)
      return NextResponse.json({ 
        error: '쿠폰 삭제 실패',
        details: error.message || '알 수 없는 오류'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: '쿠폰이 삭제되었습니다. (soft delete)'
    })
  } catch (error: any) {
    console.error('쿠폰 삭제 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}
