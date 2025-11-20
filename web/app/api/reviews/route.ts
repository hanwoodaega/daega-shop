import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// UUID 형식인지 확인하는 함수
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// GET: 특정 상품의 리뷰 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productIdOrSlug = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const photoOnly = searchParams.get('photoOnly') === 'true'
    const sortBy = searchParams.get('sortBy') || 'latest' // 'latest' or 'recommended'
    const offset = (page - 1) * limit

    if (!productIdOrSlug) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // slug인 경우 UUID로 변환
    let productId = productIdOrSlug
    if (!isUUID(productIdOrSlug)) {
      // slug로 상품 조회
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('slug', productIdOrSlug)
        .single()
      
      if (productError || !product) {
        // slug로 찾지 못했으면 UUID로 시도
        const { data: productById } = await supabase
          .from('products')
          .select('id')
          .eq('id', productIdOrSlug)
          .single()
        
        if (!productById) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }
        productId = productById.id
      } else {
        productId = product.id
      }
    }

    // 쿼리 빌더 시작
    let query = supabase
      .from('reviews')
      .select(`
        id, product_id, order_id, user_id, rating, title, content, images, is_verified_purchase, created_at, updated_at, status, admin_reply, admin_replied_at,
        users!reviews_user_id_fkey(name)
      `, { count: 'exact' })
      .eq('product_id', productId)

    // 포토 리뷰만 보기 필터
    // Supabase에서 JSON 배열 필터링은 제한적이므로, 
    // null이 아니고 빈 배열이 아닌 경우만 필터링
    if (photoOnly) {
      query = query.not('images', 'is', null)
    }

    // 정렬 설정
    if (sortBy === 'recommended') {
      // 추천순: 별점 높은 순 -> 리뷰 길이 긴 순
      // Supabase에서는 문자열 길이로 직접 정렬이 어려우므로, 
      // 데이터를 가져온 후 서버 측에서 정렬 처리
      query = query.order('rating', { ascending: false })
      query = query.order('created_at', { ascending: false })
    } else {
      // 최신순 (기본값)
      query = query.order('created_at', { ascending: false })
    }

    // 최적화: users 테이블과 JOIN하여 한 번의 쿼리로 처리
    // 우선 승인된 리뷰만 조회 시도 (status 컬럼이 없으면 폴백)
    let reviews: any[] | null = null
    let count: number | null = null
    let error: any = null
    try {
      const res = await query
        .eq('status', 'approved')
        .range(offset, offset + limit - 1)
      reviews = res.data as any[] | null
      count = res.count as number | null
      error = res.error
    } catch (e: any) {
      error = e
    }

    // status 컬럼이 없거나 오류 시 기존 방식으로 폴백
    if (error) {
      let fallbackQuery = supabase
        .from('reviews')
        .select(`
          id, product_id, order_id, user_id, rating, title, content, images, is_verified_purchase, created_at, updated_at, admin_reply, admin_replied_at,
          users!reviews_user_id_fkey(name)
        `, { count: 'exact' })
        .eq('product_id', productId)

      // 포토 리뷰만 보기 필터
      if (photoOnly) {
        fallbackQuery = fallbackQuery.not('images', 'is', null)
      }

      // 정렬 설정
      // 추천순은 서버 측에서 처리하므로 여기서는 기본 정렬만
      if (sortBy === 'recommended') {
        fallbackQuery = fallbackQuery.order('rating', { ascending: false })
        fallbackQuery = fallbackQuery.order('created_at', { ascending: false })
      } else {
        fallbackQuery = fallbackQuery.order('created_at', { ascending: false })
      }

      const res = await fallbackQuery
        .range(offset, offset + limit - 1)
      reviews = res.data as any[] | null
      count = res.count as number | null
      error = res.error
    }

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

    // JOIN 결과를 바로 사용 (추가 쿼리 불필요)
    let filteredReviews = (reviews || []).map((review: any) => {
      const userName = review.users?.name || '익명'
      
      return {
        ...review,
        user_name: maskName(userName),
        users: undefined // 불필요한 중첩 객체 제거
      }
    })

    // 포토 리뷰만 보기 필터: 빈 배열도 제외
    if (photoOnly) {
      filteredReviews = filteredReviews.filter((review: any) => {
        return review.images && 
               Array.isArray(review.images) && 
               review.images.length > 0
      })
    }

    // 추천순 정렬: 별점 높은 순 -> 리뷰 길이 긴 순
    if (sortBy === 'recommended') {
      filteredReviews.sort((a: any, b: any) => {
        // 1차: 별점 내림차순
        if (b.rating !== a.rating) {
          return (b.rating || 0) - (a.rating || 0)
        }
        // 2차: 리뷰 길이 내림차순 (content 길이)
        const aLength = (a.content || '').length
        const bLength = (b.content || '').length
        return bLength - aLength
      })
    }

    const maskedReviews = filteredReviews

    // 승인된 리뷰의 평균 별점 계산 (가능하면 status 기준, 폴백 제공)
    let averageApproved = 0
    try {
      const avgRes = await supabase
        .from('reviews')
        .select('rating', { count: 'exact' })
        .eq('product_id', productId)
        .eq('status', 'approved')
      const rows: any[] = (avgRes.data as any[]) || []
      if (rows.length > 0) {
        // PostgREST는 집계를 직접 제공하지 않으므로 수동 평균
        const sum = rows.reduce((acc, r: any) => acc + (r.rating || 0), 0)
        averageApproved = rows.length > 0 ? sum / rows.length : 0
      } else if (avgRes.error) {
        throw avgRes.error
      }
    } catch {
      // 폴백: status 컬럼이 없으면 전체 리뷰로 평균
      const avgRes = await supabase
        .from('reviews')
        .select('rating', { count: 'exact' })
        .eq('product_id', productId)
      const rows: any[] = (avgRes.data as any[]) || []
      const sum = rows.reduce((acc, r: any) => acc + (r.rating || 0), 0)
      averageApproved = rows.length > 0 ? sum / rows.length : 0
    }

    const response = NextResponse.json({
      reviews: maskedReviews,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      averageApprovedRating: Number(averageApproved.toFixed(2)),
    })
    
    // 캐싱 헤더 추가 (10초간 캐시, 60초간 stale 허용)
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60')
    
    return response
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

    // 최초에는 승인 대기 상태로 저장 (status, has_images 컬럼이 없으면 폴백)
    let review: any = null
    let insertError: any = null
    const basePayload: any = {
      product_id,
      order_id,
      user_id: user.id,
      rating,
      title: title || null,
      content,
      images,
      is_verified_purchase: true,
    }
    try {
      const res = await supabase
        .from('reviews')
        .insert({
          ...basePayload,
          status: 'pending',
          has_images: Array.isArray(images) && images.length > 0
        })
        .select()
        .single()
      review = res.data
      insertError = res.error
    } catch (e: any) {
      insertError = e
    }
    // 컬럼이 없어 실패하면 최소 필드만으로 재시도
    if (insertError) {
      const res = await supabase
        .from('reviews')
        .insert(basePayload)
        .select()
        .single()
      review = res.data
      insertError = res.error
    }

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

