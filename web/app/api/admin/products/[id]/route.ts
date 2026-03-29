import { NextResponse } from 'next/server'
import { apiJsonError, dbErrorResponse } from '@/lib/api/api-errors'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { nameToSlug } from '@/lib/utils/utils'

export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  
  // 1. 관련 테이블에서 하드 삭제 (deleted 상태인 상품은 관련 데이터를 모두 제거)
  // 1-1. 장바구니에서 해당 상품 제거 (프로모션 그룹이 아닌 일반 상품만)
  const { error: cartError } = await supabaseAdmin
    .from('carts')
    .delete()
    .eq('product_id', id)
    .is('promotion_group_id', null)
  
  if (cartError) {
    console.error('장바구니 제거 실패:', cartError)
  }
  
  // 1-2. 찜 목록에서 해당 상품 제거
  const { error: wishlistError } = await supabaseAdmin
    .from('wishlists')
    .delete()
    .eq('product_id', id)
  
  if (wishlistError) {
    console.error('찜 목록 제거 실패:', wishlistError)
  }
  
  // 1-3. 컬렉션에서 해당 상품 제거
  const { error: collectionError } = await supabaseAdmin
    .from('collection_products')
    .delete()
    .eq('product_id', id)
  
  if (collectionError) {
    console.error('컬렉션 제거 실패:', collectionError)
  }
  
  // 1-4. 선물 카테고리에서 해당 상품 제거
  const { error: giftCategoryError } = await supabaseAdmin
    .from('gift_category_products')
    .delete()
    .eq('product_id', id)
  
  if (giftCategoryError) {
    console.error('선물 카테고리 제거 실패:', giftCategoryError)
  }
  
  // 1-5. 프로모션 상품에서 해당 상품 제거
  const { error: promotionError } = await supabaseAdmin
    .from('promotion_products')
    .delete()
    .eq('product_id', id)
  
  if (promotionError) {
    console.error('프로모션 상품 제거 실패:', promotionError)
  }
  
  // 2. 상품 상태를 'deleted'로 변경 (soft delete)
  // order_items는 주문 내역이므로 유지됨
  const { error } = await supabaseAdmin
    .from('products')
    .update({ status: 'deleted' })
    .eq('id', id)
  
  if (error) return dbErrorResponse('admin/products/[id] DELETE', error)
  
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  
  const body = await request.json().catch(() => ({}))
  const allowed = ['brand','name','slug','price','category','weight_gram','status','tax_type'] as const
  const updates: Record<string, any> = {}
  
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  // tax_type 값 검증 (과세/면세)
  if ('tax_type' in updates) {
    if (updates.tax_type !== 'taxable' && updates.tax_type !== 'tax_free') {
      // 잘못된 값이면 무시하고 기본값 taxable 유지
      delete updates.tax_type
    }
  }
  
  // 선물 관련 필드 처리
  // 주의: products 테이블에는 gift 관련 컬럼이 없으므로 gift_categories와 gift_category_products 테이블을 사용해야 함
  // 임시로 이 필드들은 무시하고, gift_category_products 테이블을 사용하도록 선물관 관리 페이지를 마이그레이션해야 함
  
  // gift_categories와 gift_category_products 테이블을 사용하는 새로운 구조로 마이그레이션 필요
  // 현재는 이 필드들을 무시하여 에러 방지
  if ('gift_target' in body || 'gift_display_order' in body || 'gift_budget_targets' in body || 
      'gift_budget_order' in body || 'gift_featured' in body || 'gift_featured_order' in body) {
    console.warn('⚠️ 선물 관련 필드는 gift_categories 시스템으로 마이그레이션되어야 합니다. 현재는 무시됩니다.')
    // 이 필드들은 products 테이블에 없으므로 업데이트하지 않음
  }
  
  
  // slug 처리: 명시적으로 전달되었는지 확인
  if ('slug' in updates) {
    const slugValue = String(updates.slug || '').trim()

    if (slugValue) {
      // slug가 명시적으로 입력된 경우 - 다른 상품에서 사용 중이면 중복 불가(에러)
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('slug', slugValue)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: '이 slug는 이미 다른 상품에서 사용 중입니다. 다른 값을 입력해주세요.' },
          { status: 400 }
        )
      }
      updates.slug = slugValue
    } else {
      // slug가 빈 문자열이거나 null인 경우 - null로 설정 (또는 name에서 자동 생성)
      if ('name' in updates) {
        // name이 변경되었으면 name에서 자동 생성
        const newSlug = nameToSlug(updates.name)
        let uniqueSlug = newSlug
        let counter = 1
        
        while (true) {
          const { data: existing } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('slug', uniqueSlug)
            .neq('id', id)
            .single()
          
          if (!existing) break
          uniqueSlug = `${newSlug}-${counter}`
          counter++
        }
        updates.slug = uniqueSlug
      } else {
        // name이 변경되지 않았으면 null로 설정
        updates.slug = null
      }
    }
  } else if ('name' in updates) {
    // slug가 전달되지 않았고 name만 변경된 경우 - name에서 자동 생성
    const newSlug = nameToSlug(updates.name)
    let uniqueSlug = newSlug
    let counter = 1
    
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('slug', uniqueSlug)
        .neq('id', id)
        .single()
      
      if (!existing) break
      uniqueSlug = `${newSlug}-${counter}`
      counter++
    }
    updates.slug = uniqueSlug
  }
  
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }
  
  const { error } = await supabaseAdmin.from('products').update(updates).eq('id', id)
  if (error) {
    if (error.message?.includes('description')) {
      return apiJsonError(400, {
        error: '상품 정보를 저장할 수 없습니다. 관리자에게 문의해 주세요.',
        code: 'PRODUCT_UPDATE_SCHEMA',
      })
    }
    return dbErrorResponse('admin/products/[id] PATCH', error)
  }
  
  return NextResponse.json({ ok: true })
}


