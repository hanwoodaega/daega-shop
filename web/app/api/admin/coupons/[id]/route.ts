import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { adminCouponUpdateSchema } from '@/lib/validation/schemas/admin-coupon'

export const dynamic = 'force-dynamic'

// PUT: 쿠폰 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // 관리자 인증 확인
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

    const supabase = createSupabaseAdminClient()
    const parsed = await parseJsonBody(request, adminCouponUpdateSchema)
    if (!parsed.ok) return parsed.response

    const {
      name,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      validity_days,
      is_active,
      issue_trigger,
    } = parsed.data

    // 쿠폰 수정
    const updateData: Record<string, any> = {
      name,
      description:
        description === undefined || description === null
          ? null
          : String(description).trim() || null,
      discount_type,
      discount_value,
      min_purchase_amount:
        min_purchase_amount != null && min_purchase_amount > 0 ? min_purchase_amount : null,
      max_discount_amount:
        max_discount_amount != null && max_discount_amount > 0 ? max_discount_amount : null,
      validity_days,
      is_active,
      updated_at: new Date().toISOString(),
    }

    if (issue_trigger !== undefined) {
      updateData.issue_trigger = issue_trigger
    }

    const { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/coupons/[id] PUT', error)
    }

    return NextResponse.json({ coupon: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/coupons/[id] PUT', error)
  }
}

// DELETE: 쿠폰 삭제 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // 관리자 인증 확인
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

    const supabase = createSupabaseAdminClient()

    // 쿠폰 존재 여부 확인
    const { data: existingCoupon, error: fetchError } = await supabase
      .from('coupons')
      .select('id, is_deleted')
      .eq('id', id)
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
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/coupons/[id] DELETE', error)
    }

    return NextResponse.json({ 
      success: true,
      message: '쿠폰이 비활성화되었습니다.'
    })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/coupons/[id] DELETE', error)
  }
}
