import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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

    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)

    if (deleteError) {
      console.error('리뷰 삭제 실패:', deleteError)
      return NextResponse.json({ error: '리뷰 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ message: '리뷰가 삭제되었습니다.' })
  } catch (error) {
    console.error('리뷰 삭제 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

