import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 내가 작성한 리뷰 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await createSupabaseServerClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 사용자 본인 데이터만 조회하도록 user_id로 제한하면서,
    // pending 리뷰도 누락되지 않게 admin client로 조회한다.
    const supabase = createSupabaseAdminClient()

    const searchParams = request.nextUrl.searchParams
    const countOnly = searchParams.get('countOnly') === 'true'
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // 개수만 필요한 경우 최적화된 쿼리
    if (countOnly) {
      const { count, error: countError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', sixMonthsAgo.toISOString())

      if (countError) {
        console.error('리뷰 개수 조회 실패:', countError)
        return NextResponse.json({ error: '리뷰 개수 조회 실패' }, { status: 500 })
      }

      return NextResponse.json({ count: count || 0 })
    }

    // 전체 리뷰 목록 조회
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
          brand
        )
      `)
      .eq('user_id', user.id)
      .gte('created_at', sixMonthsAgo.toISOString())
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
        image_url: '', // product_images에서 가져와야 함
        brand: (review.products as any)?.brand || ''
      }
    }))

    return NextResponse.json({ reviews: myReviews })
  } catch (error) {
    console.error('내 리뷰 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

