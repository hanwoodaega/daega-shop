import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'

// PATCH: 리뷰 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id
    const supabase = createSupabaseServerClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { rating, title, content, images } = body

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (review.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const updateData: any = {}
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json({ error: '별점은 1-5 사이여야 합니다.' }, { status: 400 })
      }
      updateData.rating = rating
    }
    if (title !== undefined) updateData.title = title || null
    if (content !== undefined) updateData.content = content
    if (images !== undefined) updateData.images = images
    updateData.updated_at = new Date().toISOString()

    // 수정 전 product_id 가져오기
    const { data: oldReview } = await supabase
      .from('reviews')
      .select('product_id')
      .eq('id', reviewId)
      .single()

    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single()

    if (updateError) {
      console.error('리뷰 수정 실패:', updateError)
      return NextResponse.json({ error: '리뷰 수정에 실패했습니다.' }, { status: 500 })
    }

    // products 테이블의 average_rating과 review_count 업데이트
    // pending 리뷰는 통계에 반영하지 않음, approved만 반영
    if (oldReview?.product_id) {
      try {
        let finalReviews: any[] = []
        
        try {
          const { data: approvedReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', oldReview.product_id)
            .eq('status', 'approved')
          
          if (approvedReviews) {
            finalReviews = approvedReviews
          } else {
            const { data: allReviews } = await supabase
              .from('reviews')
              .select('rating')
              .eq('product_id', oldReview.product_id)
            if (allReviews) {
              finalReviews = allReviews
            }
          }
        } catch {
          const { data: allReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', oldReview.product_id)
          if (allReviews) {
            finalReviews = allReviews
          }
        }

        if (finalReviews && finalReviews.length > 0) {
          const totalRating = finalReviews.reduce((sum, r) => sum + (r.rating || 0), 0)
          const averageRating = totalRating / finalReviews.length
          const reviewCount = finalReviews.length

          const { error: updateError } = await supabase
            .from('products')
            .update({
              average_rating: Math.round(averageRating * 10) / 10,
              review_count: reviewCount
            })
            .eq('id', oldReview.product_id)
          
          if (updateError) {
            console.error('상품 통계 업데이트 실패:', updateError)
          }
        } else {
          await supabase
            .from('products')
            .update({
              average_rating: 0,
              review_count: 0
            })
            .eq('id', oldReview.product_id)
        }
      } catch (updateError) {
        console.error('상품 통계 업데이트 실패:', updateError)
      }
    }

    return NextResponse.json({ review: updatedReview })
  } catch (error) {
    console.error('리뷰 수정 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 리뷰 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id
    const supabase = createSupabaseServerClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (review.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // 삭제 전 product_id 가져오기
    const { data: reviewToDelete } = await supabase
      .from('reviews')
      .select('product_id')
      .eq('id', reviewId)
      .single()

    const productId = reviewToDelete?.product_id

    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)

    if (deleteError) {
      console.error('리뷰 삭제 실패:', deleteError)
      return NextResponse.json({ error: '리뷰 삭제에 실패했습니다.' }, { status: 500 })
    }

    // products 테이블의 average_rating과 review_count 업데이트
    // pending 리뷰는 통계에 반영하지 않음, approved만 반영
    if (productId) {
      try {
        let finalReviews: any[] = []
        
        try {
          const { data: approvedReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', productId)
            .eq('status', 'approved')
          
          if (approvedReviews) {
            finalReviews = approvedReviews
          } else {
            const { data: allReviews } = await supabase
              .from('reviews')
              .select('rating')
              .eq('product_id', productId)
            if (allReviews) {
              finalReviews = allReviews
            }
          }
        } catch {
          const { data: allReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', productId)
          if (allReviews) {
            finalReviews = allReviews
          }
        }

        if (finalReviews && finalReviews.length > 0) {
          const totalRating = finalReviews.reduce((sum, r) => sum + (r.rating || 0), 0)
          const averageRating = totalRating / finalReviews.length
          const reviewCount = finalReviews.length

          const { error: updateError } = await supabase
            .from('products')
            .update({
              average_rating: Math.round(averageRating * 10) / 10,
              review_count: reviewCount
            })
            .eq('id', productId)
          
          if (updateError) {
            console.error('상품 통계 업데이트 실패:', updateError)
          }
        } else {
          await supabase
            .from('products')
            .update({
              average_rating: 0,
              review_count: 0
            })
            .eq('id', productId)
        }
      } catch (updateError) {
        console.error('상품 통계 업데이트 실패:', updateError)
      }
    }

    return NextResponse.json({ message: '리뷰가 삭제되었습니다.' })
  } catch (error) {
    console.error('리뷰 삭제 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

