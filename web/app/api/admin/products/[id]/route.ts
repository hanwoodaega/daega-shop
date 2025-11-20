import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'
import { nameToSlug } from '@/lib/utils'

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
  const allowed = ['brand','name','slug','price','image_url','category','stock','discount_percent','promotion_type','promotion_products','is_best','is_sale','flash_sale_start_time','flash_sale_end_time','flash_sale_price','flash_sale_stock','gift_target','gift_display_order','gift_budget_targets','gift_budget_order','gift_featured','gift_featured_order'] as const
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
  
  // 선물 대상 배열 처리
  if ('gift_target' in updates) {
    if (Array.isArray(updates.gift_target)) {
      updates.gift_target = updates.gift_target.length > 0 ? updates.gift_target : null
    } else {
      updates.gift_target = null
    }
  }
  
  // 예산 카테고리 배열 처리
  if ('gift_budget_targets' in updates) {
    if (Array.isArray(updates.gift_budget_targets)) {
      updates.gift_budget_targets = updates.gift_budget_targets.length > 0 ? updates.gift_budget_targets : null
    } else {
      updates.gift_budget_targets = null
    }
  }
  
  // 예산별 순서 처리
  if ('gift_budget_order' in updates) {
    const v = Number(updates.gift_budget_order)
    updates.gift_budget_order = isNaN(v) || v < 1 ? null : v
  }
  
  // 실시간 인기 선물세트 여부 처리
  if ('gift_featured' in updates) {
    updates.gift_featured = updates.gift_featured === true || updates.gift_featured === 'true'
  }
  
  // 실시간 인기 선물세트 순서 처리
  if ('gift_featured_order' in updates) {
    const v = Number(updates.gift_featured_order)
    updates.gift_featured_order = isNaN(v) || v < 1 ? null : v
  }
  
  // 프로모션 타입 없으면 교차 상품도 null
  if ('promotion_type' in updates && !updates.promotion_type) {
    updates.promotion_products = null
  }
  
  // 타임딜 필드 검증
  if ('flash_sale_price' in updates) {
    const v = Number(updates.flash_sale_price)
    updates.flash_sale_price = isNaN(v) || v <= 0 ? null : v
  }
  
  if ('flash_sale_stock' in updates) {
    const v = Number(updates.flash_sale_stock)
    updates.flash_sale_stock = isNaN(v) || v <= 0 ? null : v
  }
  
  // 타임딜 종료 시간이 없으면 타임딜 시작 시간, 가격, 재고도 null
  if ('flash_sale_end_time' in updates && !updates.flash_sale_end_time) {
    updates.flash_sale_start_time = null
    updates.flash_sale_price = null
    updates.flash_sale_stock = null
  }
  
  // slug 처리: 명시적으로 전달되었는지 확인
  if ('slug' in updates) {
    const slugValue = String(updates.slug || '').trim()
    
    if (slugValue) {
      // slug가 명시적으로 입력된 경우 - 중복 체크 후 사용
      let uniqueSlug = slugValue
      let counter = 1
      
      while (true) {
        const { data: existing } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('slug', uniqueSlug)
          .neq('id', id)
          .single()
        
        if (!existing) break
        uniqueSlug = `${slugValue}-${counter}`
        counter++
      }
      updates.slug = uniqueSlug
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
    console.error('❌ Product update error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  return NextResponse.json({ ok: true })
}


