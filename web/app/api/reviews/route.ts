import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET: 특정 상품의 리뷰 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    const { data: reviews, error, count } = await supabase
      .from('reviews')
      .select('*, products(name)', { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('리뷰 조회 실패:', error)
      
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          reviews: [],
          total: 0,
          page,
          totalPages: 0
        })
      }
      
      return NextResponse.json({ 
        error: '리뷰 조회 실패', 
        details: error.message 
      }, { status: 500 })
    }

    const maskName = (name: string) => {
      if (!name || name.length === 0) return '익명'
      if (name.length === 1) return name
      if (name.length === 2) return name[0] + '*'
      
      const first = name[0]
      const last = name[name.length - 1]
      const middle = '*'.repeat(name.length - 2)
      return first + middle + last
    }

    const userIds = Array.from(new Set((reviews || []).map((r: any) => r.user_id)))
    
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds)
    
    const userMap = new Map((usersData || []).map((user: any) => [user.id, user.name || '익명']))

    const maskedReviews = (reviews || []).map((review: any) => {
      const userName = userMap.get(review.user_id) || '익명'
      
      return {
        ...review,
        user_name: maskName(userName),
        product_name: review.products?.name || null,
        products: undefined
      }
    })

    return NextResponse.json({
      reviews: maskedReviews,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('리뷰 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 리뷰 작성
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, order_id, rating, title, content, images = [] } = body

    if (!product_id || !order_id || !rating || !content) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: '별점은 1-5 사이여야 합니다.' }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (order.status !== 'delivered') {
      return NextResponse.json({ error: '배송 완료된 주문만 리뷰 작성이 가능합니다.' }, { status: 400 })
    }

    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', order_id)
      .eq('product_id', product_id)
      .single()

    if (orderItemError || !orderItem) {
      return NextResponse.json({ error: '주문에 해당 상품이 없습니다.' }, { status: 400 })
    }

    const { data: existingReview, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', order_id)
      .eq('product_id', product_id)
      .single()

    if (existingReview) {
      return NextResponse.json({ error: '이미 리뷰를 작성하셨습니다.' }, { status: 400 })
    }

    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        product_id,
        order_id,
        user_id: user.id,
        rating,
        title: title || null,
        content,
        images,
        is_verified_purchase: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('리뷰 작성 실패:', insertError)
      return NextResponse.json({ error: '리뷰 작성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('리뷰 작성 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

