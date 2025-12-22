import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { addPoints } from '@/lib/point/points'

// POST: 관리자가 고객에게 포인트 적립 및 알림 발송
export async function POST(request: NextRequest) {
  try {
    try { 
      assertAdmin() 
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await request.json()
    const { user_ids, points, point_type = 'purchase', notification_title, notification_content } = body

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: '수신자 목록이 필요합니다.' }, { status: 400 })
    }

    if (!points || points <= 0) {
      return NextResponse.json({ error: '유효한 포인트를 입력해주세요.' }, { status: 400 })
    }

    if (!notification_title || !notification_content) {
      return NextResponse.json({ error: '알림 제목과 내용은 필수입니다.' }, { status: 400 })
    }

    const results = {
      success: [] as string[],
      failed: [] as { userId: string; error: string }[],
    }

    // 각 사용자에게 포인트 적립 및 알림 생성
    for (const userId of user_ids) {
      try {
        // 포인트 적립
        const pointType = (point_type === 'review' ? 'review' : 'purchase') as 'purchase' | 'review'
        const success = await addPoints(
          userId,
          points,
          pointType,
          `관리자 적립: ${points.toLocaleString()}P`,
          undefined,
          undefined,
          supabase
        )

        if (!success) {
          results.failed.push({ userId, error: '포인트 적립 실패' })
          continue
        }

        // 알림 생성 (포인트 적립 알림이므로 타입은 'point')
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: notification_title,
            content: notification_content,
            type: 'point',
            is_read: false,
          })

        if (notificationError) {
          console.error(`사용자 ${userId} 알림 생성 실패:`, notificationError)
          // 포인트는 적립되었지만 알림 생성 실패는 경고만
        }

        results.success.push(userId)
      } catch (error: any) {
        console.error(`사용자 ${userId} 처리 실패:`, error)
        results.failed.push({ userId, error: error.message || '처리 실패' })
      }
    }

    if (results.failed.length > 0) {
      return NextResponse.json({
        success: true,
        message: `${results.success.length}명에게 포인트가 적립되었습니다. ${results.failed.length}명 실패.`,
        results,
      }, { status: 207 }) // Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: `${results.success.length}명에게 포인트가 적립되었습니다.`,
      count: results.success.length,
    })
  } catch (error) {
    console.error('포인트 적립 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

