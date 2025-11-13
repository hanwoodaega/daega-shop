import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 리뷰 작성 가능한 상품 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 1. 배송 완료된 주문의 모든 주문 상품 조회
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        order_id,
        quantity,
        price,
        orders!inner (
          id,
          order_number,
          status,
          created_at,
          user_id
        ),
        products (
          id,
          name,
          image_url,
          brand
        )
      `)
      .eq('orders.user_id', user.id)
      .eq('orders.status', 'delivered')
      .order('created_at', { ascending: false })

    if (orderItemsError) {
      console.error('주문 상품 조회 실패:', orderItemsError)
      return NextResponse.json({ reviewableProducts: [] })
    }

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ reviewableProducts: [] })
    }

    // 2. 이미 작성한 리뷰 조회
    const { data: existingReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('order_id, product_id')
      .eq('user_id', user.id)

    if (reviewsError) {
      console.error('리뷰 조회 실패:', reviewsError)
      return NextResponse.json({ error: '리뷰 조회 실패' }, { status: 500 })
    }

    // 3. 리뷰 작성 안 한 상품만 필터링
    const reviewableProducts = orderItems.filter(item => {
      return !existingReviews?.some(review => 
        review.order_id === item.order_id && 
        review.product_id === item.product_id
      )
    }).map(item => ({
      order_id: item.order_id,
      order_number: (item.orders as any)?.order_number,
      order_date: (item.orders as any)?.created_at,
      product_id: item.product_id,
      product_name: (item.products as any)?.name,
      product_image: (item.products as any)?.image_url,
      product_brand: (item.products as any)?.brand,
      quantity: item.quantity,
      price: item.price,
    }))

    return NextResponse.json({ reviewableProducts })
  } catch (error) {
    console.error('리뷰 작성 가능 상품 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

