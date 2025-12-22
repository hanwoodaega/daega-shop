import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

// POST: 관리자가 알림 생성 및 발송
export async function POST(request: NextRequest) {
  try {
    try { assertAdmin() } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await request.json()
    const { title, content, type, user_ids } = body

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 })
    }

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: '수신자 목록이 필요합니다.' }, { status: 400 })
    }

    // 알림 타입 검증 (general, point, review만 허용)
    const validTypes = ['general', 'point', 'review']
    const notificationType = type || 'general'
    if (!validTypes.includes(notificationType)) {
      return NextResponse.json({ 
        error: `알림 타입은 ${validTypes.join(', ')} 중 하나여야 합니다.` 
      }, { status: 400 })
    }

    // 관리자 ID 가져오기 (쿠키에서 또는 세션에서)
    // 일단 null로 설정 (필요시 추가)
    const createdBy = null

    // 각 사용자에게 알림 생성
    const notifications = user_ids.map((userId: string) => ({
      user_id: userId,
      title,
      content,
      type: notificationType,
      is_read: false,
      created_by: createdBy,
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      console.error('알림 생성 실패:', error)
      return NextResponse.json({ error: '알림 생성 실패' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0,
      notifications: data 
    })
  } catch (error) {
    console.error('알림 생성 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

