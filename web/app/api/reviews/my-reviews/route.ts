import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 내가 작성한 리뷰 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        product_id,
        order_id,
        rating,
        title,
        content,
        images,
        created_at,
        products (
          id,
          name,
          image_url,
          brand
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (reviewsError) {
      console.error('내 리뷰 조회 실패:', reviewsError)
      return NextResponse.json({ error: '리뷰 조회 실패' }, { status: 500 })
    }

    const myReviews = (reviews || []).map(review => ({
      id: review.id,
      product_id: review.product_id,
      order_id: review.order_id,
      rating: review.rating,
      title: review.title || '',
      content: review.content,
      images: review.images || [],
      created_at: review.created_at,
      product: {
        name: (review.products as any)?.name || '',
        image_url: (review.products as any)?.image_url || '',
        brand: (review.products as any)?.brand || ''
      }
    }))

    return NextResponse.json({ reviews: myReviews })
  } catch (error) {
    console.error('내 리뷰 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

