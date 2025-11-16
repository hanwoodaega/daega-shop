import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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
      .select('id, user_id, images')
      .eq('id', reviewId)
      .single()
    if (reviewError || !review) {
      return NextResponse.json({ error: '리뷰가 존재하지 않습니다.' }, { status: 404 })
    }

    // 상태 업데이트 (가능하면 승인정보 기록)
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }
    if (status) {
      updatePayload.status = status
      try {
        Object.assign(updatePayload, {
          approved_at: status === 'approved' ? new Date().toISOString() : null,
        })
      } catch {}
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
      return NextResponse.json({ error: '상태 업데이트 실패' }, { status: 500 })
    }

    // 승인 시 포인트 적립 (기본: 텍스트 200P, 사진 500P) 또는 관리자 지정 포인트
    if (status === 'approved') {
      const hasImages = Array.isArray((review as any).images) && (review as any).images.length > 0
      const awardPoints = typeof points === 'number' && points >= 0 ? points : (hasImages ? 500 : 200)

      // user_points upsert/업데이트
      const { data: userPoints } = await supabase
        .from('user_points')
        .select('user_id, total_points, purchase_count')
        .eq('user_id', review.user_id)
        .single()

      if (!userPoints) {
        const { error: initErr } = await supabase
          .from('user_points')
          .insert({
            user_id: review.user_id,
            total_points: awardPoints,
            purchase_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        if (initErr) {
          console.error('포인트 초기화 실패:', initErr)
        }
      } else {
        const { error: updErr } = await supabase
          .from('user_points')
          .update({
            total_points: (userPoints.total_points || 0) + awardPoints,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', review.user_id)
        if (updErr) {
          console.error('포인트 업데이트 실패:', updErr)
        }
      }

      // point_history 기록
      const { error: histErr } = await supabase
        .from('point_history')
        .insert({
          user_id: review.user_id,
          points: awardPoints,
          type: 'review',
          description: typeof points === 'number' ? '관리자 지정 리뷰 적립' : (hasImages ? '사진 리뷰 적립' : '텍스트 리뷰 적립'),
          review_id: reviewId,
        })
      if (histErr) {
        console.error('포인트 히스토리 기록 실패:', histErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('관리자 리뷰 상태변경 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
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


