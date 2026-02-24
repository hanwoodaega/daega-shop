import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'
import { fetchCartItemsForUser } from '@/lib/cart/cart-service'

export const dynamic = 'force-dynamic'

// GET: 장바구니 조회
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const items = await fetchCartItemsForUser(supabase, user.id)

    return NextResponse.json({ 
      success: true, 
      items
    })
  } catch (error) {
    console.error('장바구니 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 장바구니에 상품 추가
export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const { 
      product_id, 
      quantity, 
      promotion_type, 
      promotion_group_id,
      discount_percent 
    } = await request.json()

    if (!product_id || !quantity) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 })
    }

    // 프로모션 그룹이 있으면 항상 새로 추가
    if (promotion_group_id) {
      const { data, error } = await supabase
        .from('carts')
        .insert({
          user_id: user.id,
          product_id,
          quantity,
          promotion_type,
          promotion_group_id,
          discount_percent
        })
        .select()
        .single()

      if (error) {
        console.error('장바구니 추가 실패:', error)
        return NextResponse.json({ error: '장바구니 추가 실패' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: '장바구니에 추가되었습니다.',
        data 
      })
    }

    // 일반 상품: 기존 상품이 있으면 수량 증가
    const { data: existing } = await supabase
      .from('carts')
      .select()
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .is('promotion_group_id', null)
      .single()

    if (existing) {
      // 기존 상품 수량 증가
      const { data, error } = await supabase
        .from('carts')
        .update({ 
          quantity: existing.quantity + quantity,
          discount_percent: discount_percent ?? existing.discount_percent
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('장바구니 수량 업데이트 실패:', error)
        return NextResponse.json({ error: '장바구니 수량 업데이트 실패' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: '장바구니에 추가되었습니다.',
        data,
        updated: true
      })
    }

    // 새 상품 추가
    const { data, error } = await supabase
      .from('carts')
      .insert({
        user_id: user.id,
        product_id,
        quantity,
        discount_percent
      })
      .select()
      .single()

    if (error) {
      console.error('장바구니 추가 실패:', error)
      return NextResponse.json({ error: '장바구니 추가 실패' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '장바구니에 추가되었습니다.',
      data 
    })
  } catch (error) {
    console.error('장바구니 추가 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PATCH: 장바구니 상품 수량 수정
export async function PATCH(request: Request) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const { id, quantity } = await request.json()

    if (!id || !quantity) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 })
    }

    // 수량 업데이트
    const { data, error } = await supabase
      .from('carts')
      .update({ quantity })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('장바구니 수량 수정 실패:', error)
      return NextResponse.json({ error: '장바구니 수량 수정 실패' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '수량이 수정되었습니다.',
      data 
    })
  } catch (error) {
    console.error('장바구니 수량 수정 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 장바구니에서 상품 제거
export async function DELETE(request: Request) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const { id, promotion_group_id } = await request.json()

    if (!id && !promotion_group_id) {
      return NextResponse.json({ error: '삭제할 항목의 ID가 필요합니다.' }, { status: 400 })
    }

    // 프로모션 그룹이 있으면 같은 그룹의 모든 상품 삭제
    if (promotion_group_id) {
      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('user_id', user.id)
        .eq('promotion_group_id', promotion_group_id)

      if (error) {
        console.error('장바구니 제거 실패:', error)
        return NextResponse.json({ error: '장바구니 제거 실패' }, { status: 500 })
      }
    } else {
      // 일반 상품 제거
      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('장바구니 제거 실패:', error)
        return NextResponse.json({ error: '장바구니 제거 실패' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: '장바구니에서 제거되었습니다.' 
    })
  } catch (error) {
    console.error('장바구니 제거 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

