import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// GET: 장바구니 조회
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 장바구니 조회 (상품 정보, 프로모션 정보 포함)
    const { data, error } = await supabase
      .from('carts')
      .select(`
        id,
        product_id,
        quantity,
        promotion_group_id,
        discount_percent,
        created_at,
        updated_at,
        products (
          id,
          slug,
          name,
          price,
          brand,
          status,
          promotion_products (
            promotion_id,
            promotions (
              id,
              type,
              buy_qty,
              discount_percent,
              is_active
            )
          )
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('장바구니 조회 실패:', error)
      return NextResponse.json({ error: '장바구니 조회 실패' }, { status: 500 })
    }

    // 상품 이미지 조회 (product_id 목록)
    const productIds = (data || []).map((item: any) => item.product_id).filter(Boolean)
    let productImages: { [key: string]: string } = {}
    
    if (productIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url')
        .in('product_id', productIds)
        .eq('is_primary', true)
      
      if (imagesData) {
        productImages = imagesData.reduce((acc: any, img: any) => {
          acc[img.product_id] = img.image_url
          return acc
        }, {})
      }
    }

    // localStorage 형식과 호환되도록 변환
    const items = (data || []).map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      
      // 프로모션 정보 추출
      const promotionProducts = product?.promotion_products || []
      const promotion = promotionProducts.length > 0 
        ? promotionProducts[0]?.promotions 
        : null
      
      // 할인율 결정
      const discountPercent = item.discount_percent || promotion?.discount_percent || 0
      
      // 프로모션 타입 결정
      let promotionType: string | undefined = undefined
      if (promotion?.is_active && promotion?.type === 'bogo' && promotion.buy_qty) {
        promotionType = `${promotion.buy_qty}+1`
      } else if (promotion?.is_active && promotion?.type === 'discount') {
        promotionType = 'discount'
      }
      
      return {
        id: item.id,
        productId: item.product_id,
        slug: product?.slug || null,
        name: product?.name || '',
        price: product?.price || 0,
        quantity: item.quantity,
        imageUrl: productImages[item.product_id] || '',
        discount_percent: discountPercent,
        brand: product?.brand,
        promotion_type: promotionType,
        promotion_group_id: item.promotion_group_id,
        selected: true, // 기본값
        status: product?.status || 'active'
      }
    })

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
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

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
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

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
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { id, promotion_group_id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 })
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

