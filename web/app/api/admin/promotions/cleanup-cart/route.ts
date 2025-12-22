import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

// POST: 프로모션 삭제 시 장바구니에서 해당 상품 제거
export async function POST(request: NextRequest) {
  try {
    const { product_ids } = await request.json()

    console.log('[cleanup-cart] 요청 받음:', { product_ids })

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // 1. 해당 상품들이 포함된 모든 장바구니 아이템 조회
    const { data: cartItems, error: fetchError } = await supabase
      .from('carts')
      .select('id, promotion_group_id, product_id, user_id')
      .in('product_id', product_ids)

    console.log('[cleanup-cart] 장바구니 조회 결과:', { 
      itemCount: cartItems?.length || 0,
      error: fetchError 
    })

    if (fetchError) {
      console.error('[cleanup-cart] 장바구니 조회 실패:', fetchError)
      return NextResponse.json({ error: '조회 실패' }, { status: 500 })
    }

    if (!cartItems || cartItems.length === 0) {
      console.log('[cleanup-cart] 장바구니에 해당 상품 없음')
      return NextResponse.json({ 
        success: true,
        message: '장바구니에 해당 상품이 없습니다.',
        deletedCount: 0
      })
    }

    // 2. promotion_group_id가 있는 아이템들의 그룹 ID 수집
    const groupIds = Array.from(new Set(
      cartItems
        .filter(item => item.promotion_group_id)
        .map(item => item.promotion_group_id)
    ))

    console.log('[cleanup-cart] 프로모션 그룹 ID들:', groupIds)

    let deletedCount = 0

    // 3. 프로모션 그룹만 삭제 (일반 상품은 유지)
    if (groupIds.length > 0) {
      // 먼저 삭제할 아이템 개수 확인
      const { count: beforeCount } = await supabase
        .from('carts')
        .select('*', { count: 'exact', head: true })
        .in('promotion_group_id', groupIds)
      
      console.log('[cleanup-cart] 프로모션 그룹 삭제 전 개수:', beforeCount)

      const { error: deleteGroupError } = await supabase
        .from('carts')
        .delete()
        .in('promotion_group_id', groupIds)

      console.log('[cleanup-cart] 프로모션 그룹 삭제:', { 
        error: deleteGroupError 
      })

      if (deleteGroupError) {
        console.error('[cleanup-cart] 프로모션 그룹 삭제 실패:', deleteGroupError)
      } else {
        deletedCount += beforeCount || 0
      }
    }

    // 일반 상품은 삭제하지 않음 (프로모션이 없어져도 장바구니에는 남김)
    const nonGroupItems = cartItems.filter(item => !item.promotion_group_id)
    if (nonGroupItems.length > 0) {
      console.log('[cleanup-cart] 일반 상품은 유지:', nonGroupItems.length, '개')
    }

    console.log(`[cleanup-cart] 완료: ${deletedCount}개 장바구니 아이템 제거됨`)

    return NextResponse.json({ 
      success: true,
      message: `${deletedCount}개의 장바구니 아이템이 제거되었습니다.`,
      deletedCount
    })
  } catch (error: any) {
    console.error('[cleanup-cart] 에러:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}


