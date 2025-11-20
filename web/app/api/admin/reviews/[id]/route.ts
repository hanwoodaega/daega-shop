import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { addPoints } from '@/lib/points'

// PATCH /api/admin/reviews/:id  { status: 'approved' | 'rejected' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    try { assertAdmin() } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const reviewId = params.id
    const supabase = createSupabaseServerClient()
    const body = await request.json()
    const { status, reply, deleteReply, points } = body as { status?: 'approved' | 'rejected', reply?: string, deleteReply?: boolean, points?: number }
    if (!status && typeof reply === 'undefined' && !deleteReply) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    // 리뷰 조회
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, images, product_id')
      .eq('id', reviewId)
      .single()
    if (reviewError || !review) {
      console.error('리뷰 조회 실패:', reviewError)
      return NextResponse.json({ error: '리뷰가 존재하지 않습니다.' }, { status: 404 })
    }

    // 상품명 조회 (별도 쿼리)
    let productName = '상품'
    if (review.product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', review.product_id)
        .single()
      
      if (product) {
        productName = product.name || '상품'
      }
    }

    // 상태 업데이트
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

    const { error: updateError } = await supabase
      .from('reviews')
      .update(updatePayload)
      .eq('id', reviewId)
    if (updateError) {
      console.error('리뷰 상태 업데이트 실패:', updateError)
      console.error('업데이트 페이로드:', JSON.stringify(updatePayload, null, 2))
      console.error('에러 상세:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      return NextResponse.json({ 
        error: `상태 업데이트 실패: ${updateError.message || '알 수 없는 오류'}`,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      }, { status: 500 })
    }

    // 승인 시 포인트 적립 (기본: 일반 리뷰 200P, 사진 리뷰 500P) 또는 관리자 지정 포인트
    if (status === 'approved') {
      const hasImages = Array.isArray((review as any).images) && (review as any).images.length > 0
      const awardPoints = typeof points === 'number' && points >= 0 ? points : (hasImages ? 500 : 300)

      // addPoints 함수 사용 (일관성 유지)
      const description = typeof points === 'number' ? '관리자 지정 리뷰 적립' : (hasImages ? '사진 리뷰 적립' : '텍스트 리뷰 적립')
      
      let pointsAwarded = false
      try {
        const success = await addPoints(
          review.user_id,
          awardPoints,
          'review',
          description,
          undefined, // order_id는 없음
          reviewId
        )

        if (success) {
          pointsAwarded = true
          console.log(`포인트 적립 성공: 사용자 ${review.user_id}에게 ${awardPoints}P 적립`)
        } else {
          console.error('포인트 적립 실패: addPoints가 false를 반환했습니다.')
        }
      } catch (error: any) {
        console.error('포인트 적립 중 오류:', error)
        console.error('에러 스택:', error.stack)
      }

      // 리뷰 승인 알림 생성 (포인트 적립 성공 여부와 관계없이)
      // RLS 정책을 우회하기 위해 관리자 클라이언트 사용
      try {
        const notificationTitle = `리뷰 ${awardPoints.toLocaleString()}P 적립`
        const notificationContent = `${productName} 리뷰로 포인트가 적립되었습니다.`

        const supabaseAdmin = createSupabaseAdminClient()
        const { error: notificationError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: review.user_id,
            title: notificationTitle,
            content: notificationContent,
            type: 'review',
            is_read: false,
          })

        if (notificationError) {
          console.error('리뷰 승인 알림 생성 실패:', notificationError)
          console.error('알림 생성 에러 상세:', {
            message: notificationError.message,
            details: notificationError.details,
            hint: notificationError.hint,
            code: notificationError.code
          })
        } else {
          console.log(`리뷰 승인 알림 생성 성공: 사용자 ${review.user_id}`)
        }
      } catch (error: any) {
        console.error('알림 생성 중 예외 발생:', error)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('관리자 리뷰 상태변경 실패:', error)
    return NextResponse.json({ 
      error: error.message || '서버 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// DELETE /api/admin/reviews/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    try { assertAdmin() } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const reviewId = params.id
    const supabase = createSupabaseServerClient()

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
    if (error) {
      return NextResponse.json({ error: '리뷰 삭제 실패' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('관리자 리뷰 삭제 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}


