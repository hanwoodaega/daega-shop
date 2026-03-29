import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { adminCouponCreateSchema } from '@/lib/validation/schemas/admin-coupon'

export const dynamic = 'force-dynamic'

// GET: 쿠폰 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

    const supabase = createSupabaseAdminClient()

    // 쿠폰 목록 조회 (활성만 표시, 삭제 시 is_active false로 목록에서 제외)
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      return dbErrorResponse('admin/coupons GET', error)
    }

    return NextResponse.json({ coupons: data || [] })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/coupons GET', error)
  }
}

// POST: 쿠폰 생성
export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

    const supabase = createSupabaseAdminClient()
    const parsed = await parseJsonBody(request, adminCouponCreateSchema)
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

    // 쿠폰 생성
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        name,
        description: description?.trim() ? description.trim() : null,
        discount_type,
        discount_value,
        min_purchase_amount:
          min_purchase_amount != null && min_purchase_amount > 0 ? min_purchase_amount : null,
        max_discount_amount:
          max_discount_amount != null && max_discount_amount > 0 ? max_discount_amount : null,
        validity_days,
        is_active: is_active !== false,
        issue_trigger: issue_trigger || 'ADMIN',
      })
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/coupons POST', error)
    }

    return NextResponse.json({ coupon: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/coupons POST', error)
  }
}

