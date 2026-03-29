import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, logApiError, unknownErrorResponse } from '@/lib/api/api-errors'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
// PATCH /api/admin/reviews/:id  { status: 'approved' | 'rejected' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized
    const reviewId = id
    const supabase = await createSupabaseServerClient()
    const supabaseAdmin = createSupabaseAdminClient() // RLS 우회를 위한 관리자 클라이언트
    const body = await request.json()
    const { status, reply, deleteReply } = body as { status?: 'approved' | 'rejected', reply?: string, deleteReply?: boolean }
    if (!status && typeof reply === 'undefined' && !deleteReply) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select('id, user_id, product_id')
      .eq('id', reviewId)
      .single()
    if (reviewError || !review) {
      console.error('리뷰 조회 실패:', reviewError)
      return NextResponse.json({ error: '리뷰가 존재하지 않습니다.' }, { status: 404 })
    }

    // 상태 업데이트 (관리자 클라이언트 사용)
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }
    if (status) {
      updatePayload.status = status
    }
    if (typeof reply !== 'undefined') {
      updatePayload.admin_reply = reply || null
      updatePayload.admin_replied_at = reply ? new Date().toISOString() : null
    }
    if (deleteReply) {
      updatePayload.admin_reply = null
      updatePayload.admin_replied_at = null
    }

    const { data: updatedReview, error: updateError } = await supabaseAdmin
      .from('reviews')
      .update(updatePayload)
      .eq('id', reviewId)
      .select()
      .single()
    if (updateError) {
      console.error('리뷰 상태 업데이트 실패:', updateError)
      console.error('업데이트 페이로드:', JSON.stringify(updatePayload, null, 2))
      console.error('에러 상세:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      return dbErrorResponse('admin reviews PATCH update', updateError)
    }

    // 업데이트 확인
    if (status && updatedReview && updatedReview.status !== status) {
      console.error('상태 업데이트 확인 실패:', {
        expected: status,
        actual: updatedReview.status,
        reviewId
      })
      logApiError('admin reviews PATCH status mismatch', {
        expected: status,
        actual: updatedReview.status,
        reviewId,
      })
      return NextResponse.json(
        { error: '상태 업데이트가 제대로 반영되지 않았습니다.', code: 'STATE_MISMATCH' },
        { status: 500 }
      )
    }

    // products 테이블의 average_rating과 review_count 업데이트 (승인 시 포인트 지급 없음, 작성 시 이미 지급됨)
    // status가 변경되었을 때만 통계 업데이트 (approved만 반영)
    if (status && review.product_id) {
      try {
        const { data: approvedReviews } = await supabaseAdmin
          .from('reviews')
          .select('rating')
          .eq('product_id', review.product_id)
          .eq('status', 'approved')
        
        if (approvedReviews && approvedReviews.length > 0) {
          const totalRating = approvedReviews.reduce((sum, r) => sum + (r.rating || 0), 0)
          const averageRating = totalRating / approvedReviews.length
          const reviewCount = approvedReviews.length

          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update({
              average_rating: Math.round(averageRating * 10) / 10,
              review_count: reviewCount
            })
            .eq('id', review.product_id)
          
          if (updateError) {
            console.error('상품 통계 업데이트 실패:', updateError)
          }
        } else {
          // approved 리뷰가 없으면 0으로 설정
          await supabaseAdmin
            .from('products')
            .update({
              average_rating: 0,
              review_count: 0
            })
            .eq('id', review.product_id)
        }
      } catch (updateError) {
        console.error('상품 통계 업데이트 실패:', updateError)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin reviews PATCH', error)
  }
}

// DELETE /api/admin/reviews/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized
    const reviewId = id
    const supabaseAdmin = createSupabaseAdminClient() // RLS 우회를 위한 관리자 클라이언트

    const { data: reviewToUpdate } = await supabaseAdmin
      .from('reviews')
      .select('product_id')
      .eq('id', reviewId)
      .single()

    const productId = reviewToUpdate?.product_id

    const { error: updateError } = await supabaseAdmin
      .from('reviews')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', reviewId)
    if (updateError) {
      return dbErrorResponse('admin reviews DELETE', updateError)
    }

    // products 테이블의 average_rating과 review_count 업데이트
    if (productId) {
      try {
        const { data: approvedReviews } = await supabaseAdmin
          .from('reviews')
          .select('rating')
          .eq('product_id', productId)
          .eq('status', 'approved')
        
        if (approvedReviews && approvedReviews.length > 0) {
          const totalRating = approvedReviews.reduce((sum, r) => sum + (r.rating || 0), 0)
          const averageRating = totalRating / approvedReviews.length
          const reviewCount = approvedReviews.length

          const { error: updateError } = await supabaseAdmin
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
          await supabaseAdmin
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

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin reviews DELETE', error)
  }
}


