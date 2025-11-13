import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertAdmin() } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  
  // 1. 프로모션 중인 상품인지 확인
  const { data: product, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('promotion_type, promotion_products')
    .eq('id', id)
    .single()
  
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 })
  }
  
  // 2. 프로모션 중이면 삭제 불가
  if (product.promotion_type || product.promotion_products) {
    return NextResponse.json({ 
      error: '프로모션 중인 상품은 삭제할 수 없습니다. 먼저 프로모션을 해제해주세요.' 
    }, { status: 400 })
  }
  
  // 3. 상품 삭제
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  
  // 4. 장바구니에서도 해당 상품 제거 (프로모션 그룹이 아닌 일반 상품만)
  const { error: cartError } = await supabaseAdmin
    .from('carts')
    .delete()
    .eq('product_id', id)
    .is('promotion_group_id', null)
  
  if (cartError) {
    console.error('장바구니 제거 실패:', cartError)
  }
  
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertAdmin() } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  
  const body = await request.json().catch(() => ({}))
  const allowed = ['brand','name','description','price','image_url','category','stock','unit','weight','origin','discount_percent','promotion_type','promotion_products','is_new','is_best','is_sale','is_budget'] as const
  const updates: Record<string, any> = {}
  
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key]
    }
  }
  
  // 할인율 검증
  if ('discount_percent' in updates) {
    const v = Number(updates.discount_percent)
    updates.discount_percent = isNaN(v) ? null : Math.max(0, Math.min(100, v))
  }
  
  // 프로모션 상품 배열 처리
  if ('promotion_products' in updates) {
    if (Array.isArray(updates.promotion_products)) {
      updates.promotion_products = updates.promotion_products.length > 0 ? updates.promotion_products : null
    } else {
      updates.promotion_products = null
    }
  }
  
  // 프로모션 타입 없으면 교차 상품도 null
  if ('promotion_type' in updates && !updates.promotion_type) {
    updates.promotion_products = null
  }
  
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }
  
  const { error } = await supabaseAdmin.from('products').update(updates).eq('id', id)
  if (error) {
    console.error('❌ Product update error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  return NextResponse.json({ ok: true })
}


