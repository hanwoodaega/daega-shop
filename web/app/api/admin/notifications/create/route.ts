import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

// POST: 관리자가 알림 생성 및 발송
export async function POST(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

    const supabase = createSupabaseAdminClient()
    const body = await request.json()
    const { title, content, type, user_ids } = body

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 })
    }

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: '수신자 목록이 필요합니다.' }, { status: 400 })
    }

    const uniqueUserIds = Array.from(
      new Set(user_ids.map((id: unknown) => String(id ?? '').trim()).filter((id) => id.length > 0))
    )
    if (uniqueUserIds.length === 0) {
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

    const { data: activeRows, error: activeErr } = await supabase
      .from('users')
      .select('id')
      .in('id', uniqueUserIds)
      .eq('status', 'active')

    if (activeErr) {
      console.error('알림 수신자(active) 확인 실패:', activeErr)
      return NextResponse.json({ error: '수신자 확인에 실패했습니다.' }, { status: 500 })
    }

    const activeIds = new Set((activeRows || []).map((r: { id: string }) => r.id))
    if (activeIds.size !== uniqueUserIds.length) {
      return NextResponse.json(
        {
          error:
            '활성 회원에게만 알림을 보낼 수 있습니다. 수신자 목록을 새로고침한 뒤 다시 선택해 주세요.',
        },
        { status: 400 }
      )
    }

    // 각 사용자에게 알림 생성 (user_id = Auth id = public.users.id, 계정마다 별도 행)
    const notifications = uniqueUserIds.map((userId: string) => ({
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

