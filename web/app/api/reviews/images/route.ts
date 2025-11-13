import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 특정 상품의 리뷰 이미지 조회 (무한 스크롤)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // 페이지네이션 적용
    const offset = (page - 1) * limit

    // 전체 리뷰 수 조회 (이미지가 있는 것만)
    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .not('images', 'is', null)

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, images, created_at')
      .eq('product_id', productId)
      .not('images', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('리뷰 이미지 조회 실패:', error)
      return NextResponse.json({ 
        error: '리뷰 이미지 조회 실패', 
        details: error.message 
      }, { status: 500 })
    }

    const images: string[] = []
    const imageReviewMap: { [key: string]: string } = {}
    
    reviews?.forEach((review: any) => {
      if (review.images && Array.isArray(review.images)) {
        review.images.forEach((img: string) => {
          images.push(img)
          imageReviewMap[img] = review.id
        })
      }
    })

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      images,
      imageReviewMap,
      page,
      totalPages,
      hasMore: page < totalPages,
      totalReviews: count || 0
    })
  } catch (error) {
    console.error('리뷰 이미지 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

