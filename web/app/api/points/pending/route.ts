import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 승인 대기 중인 리뷰의 적립 예정 포인트 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 승인 대기 중인 리뷰 조회 (status='pending' 또는 status가 null인 경우)
    const { data: pendingReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, images, status')
      .eq('user_id', user.id)
      .or('status.eq.pending,status.is.null')

    if (reviewsError) {
      console.error('리뷰 조회 실패:', reviewsError)
      return NextResponse.json({ pendingPoints: 0, pendingCount: 0 })
    }

    // 각 리뷰의 적립 예정 포인트 계산
    // 사진 리뷰: 500P, 일반 리뷰: 200P
    let totalPendingPoints = 0
    const pendingCount = pendingReviews?.length || 0

    if (pendingReviews) {
      pendingReviews.forEach((review: any) => {
        const hasImages = Array.isArray(review.images) && review.images.length > 0
        const points = hasImages ? 500 : 200
        totalPendingPoints += points
      })
    }

    return NextResponse.json({
      pendingPoints: totalPendingPoints,
      pendingCount,
    })
  } catch (error) {
    console.error('적립 예정 포인트 조회 오류:', error)
    return NextResponse.json({ pendingPoints: 0, pendingCount: 0 })
  }
}

