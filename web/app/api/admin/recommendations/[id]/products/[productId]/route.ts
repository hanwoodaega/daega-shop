import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// PATCH: 추천 상품의 sort_order 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { id, productId } = await params
    const body = await request.json()
    const { sort_order } = body

    if (sort_order === undefined) {
      return NextResponse.json({ error: 'sort_order가 필요합니다.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('recommendation_products')
      .update({ sort_order })
      .eq('recommendation_category_id', id)
      .eq('product_id', productId)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/recommendations/[id]/products/[productId] PATCH', error)
    }

    return NextResponse.json({ product: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/recommendations/[id]/products/[productId] PATCH', error)
  }
}


