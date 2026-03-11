import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 리뷰 작성 가능한 상품 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await createSupabaseServerClient()
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // RLS 우회를 위해 admin client 사용
    const supabase = createSupabaseAdminClient()

    // 1. 구매확정(완료)된 주문의 모든 주문 상품 조회
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
          brand
        )
      `)
      .eq('orders.user_id', user.id)
      .eq('orders.status', 'CONFIRMED')
      .order('created_at', { ascending: false })

    if (orderItemsError) {
      console.error('주문 상품 조회 실패:', orderItemsError)
      return NextResponse.json({ reviewableProducts: [] })
    }

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ reviewableProducts: [] })
    }

    // 2. 구매확정된 주문 ID 조회 (point_history에서 type='purchase'인 주문)
    const orderIds = Array.from(new Set(orderItems.map((item: any) => item.order_id)))
    
    if (orderIds.length === 0) {
      return NextResponse.json({ reviewableProducts: [] })
    }

    const { data: confirmedOrders, error: confirmedError } = await supabase
      .from('point_history')
      .select('order_id')
      .eq('user_id', user.id)
      .in('order_id', orderIds)
      .eq('type', 'purchase')
      .not('order_id', 'is', null) // order_id가 null이 아닌 것만

    if (confirmedError) {
      console.error('구매확정 주문 조회 실패:', confirmedError)
      return NextResponse.json({ error: '구매확정 주문 조회 실패' }, { status: 500 })
    }

    const confirmedOrderIds = new Set(
      (confirmedOrders || [])
        .map((ph: any) => ph.order_id)
        .filter((id: string | null) => id !== null) // null 제거
    )

    // 3. 구매확정된 주문의 상품만 필터링
    const confirmedOrderItems = orderItems.filter((item: any) => 
      confirmedOrderIds.has(item.order_id)
    )

    if (confirmedOrderItems.length === 0) {
      return NextResponse.json({ reviewableProducts: [] })
    }

    // 4. 이미 작성한 리뷰 조회
    const { data: existingReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('order_id, product_id')
      .eq('user_id', user.id)

    if (reviewsError) {
      console.error('리뷰 조회 실패:', reviewsError)
      return NextResponse.json({ error: '리뷰 조회 실패' }, { status: 500 })
    }

    // 5. 리뷰 작성 안 한 상품만 필터링
    const filteredItems = confirmedOrderItems.filter(item => {
      return !existingReviews?.some(review => 
        review.order_id === item.order_id && 
        review.product_id === item.product_id
      )
    })

    // 6. 같은 주문에서 같은 상품은 하나만 표시 (order_id + product_id 조합으로 중복 제거)
    const uniqueProductsMap = new Map<string, any>()
    for (const item of filteredItems) {
      const key = `${item.order_id}-${item.product_id}`
      if (!uniqueProductsMap.has(key)) {
        uniqueProductsMap.set(key, item)
      }
    }

    // 7. 상품 이미지 조회 (product_images 우선순위 순, 상품당 1장)
    const uniqueItems = Array.from(uniqueProductsMap.values())
    const productIds = Array.from(new Set(uniqueItems.map((item: any) => item.product_id)))

    let productImages: Record<string, string> = {}
    if (productIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url, priority')
        .in('product_id', productIds)
        .order('priority', { ascending: true })

      const byProduct = new Map<string, string>()
      imagesData?.forEach((img: any) => {
        if (img?.product_id && !byProduct.has(img.product_id)) {
          byProduct.set(img.product_id, img.image_url || '')
        }
      })
      productImages = Object.fromEntries(byProduct)
    }

    const reviewableProducts = uniqueItems.map((item: any) => ({
      order_item_id: item.id, // 고유한 key를 위한 order_item.id 추가
      order_id: item.order_id,
      order_number: (item.orders as any)?.order_number,
      order_date: (item.orders as any)?.created_at,
      product_id: item.product_id,
      product_name: (item.products as any)?.name,
      product_image: productImages[item.product_id] || null,
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

