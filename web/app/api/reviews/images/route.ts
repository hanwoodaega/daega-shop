import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'

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

    const supabase = await createSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const visibilityFilter = currentUser?.id
      ? `status.eq.approved,and(status.eq.pending,user_id.eq.${currentUser.id})`
      : 'status.eq.approved'

    const offset = (page - 1) * limit

    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .not('images', 'is', null)
      .or(visibilityFilter)

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, images, created_at')
      .eq('product_id', productId)
      .not('images', 'is', null)
      .or(visibilityFilter)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return dbErrorResponse('reviews/images GET', error)
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
  } catch (error: unknown) {
    return unknownErrorResponse('reviews/images GET', error)
  }
}

