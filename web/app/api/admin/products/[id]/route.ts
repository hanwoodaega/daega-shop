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
  const allowed = ['brand','name','slug','price','image_url','category'] as const
  const updates: Record<string, any> = {}
  
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key]
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
  
  // 디버깅: 업데이트할 필드 확인
  console.log('📝 Updating product:', id, 'Fields:', Object.keys(updates))
  
  const { error } = await supabaseAdmin.from('products').update(updates).eq('id', id)
  if (error) {
    console.error('❌ Product update error:', error)
    console.error('❌ Update data:', updates)
    
    // description 필드 관련 에러인 경우 특별 처리
    if (error.message?.includes('description')) {
      return NextResponse.json({ 
        error: '데이터베이스 트리거 오류: description 필드가 없습니다. 관리자에게 문의하세요.' 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  return NextResponse.json({ ok: true })
}


