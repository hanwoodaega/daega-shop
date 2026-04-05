import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { unknownErrorResponse } from '@/lib/api/api-errors'

/** `YYYY-MM-DD` 를 한국(Asia/Seoul) 달력의 그날 00:00~24:00 구간으로 변환 */
function kstDayBoundsUtc(dateStr: string): { fromIso: string; toIso: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  const from = new Date(`${dateStr}T00:00:00+09:00`)
  if (Number.isNaN(from.getTime())) return null
  const to = new Date(from.getTime() + 86400000)
  return { fromIso: from.toISOString(), toIso: to.toISOString() }
}

/**
 * GET: 관리자 — 특정 날짜(한국 기준)에 생성된 알림 전부 조회
 * ?date=YYYY-MM-DD (필수)
 */
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminApi(request)
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    if (!dateStr) {
      return NextResponse.json({ error: 'date(YYYY-MM-DD) 파라미터가 필요합니다.' }, { status: 400 })
    }

    const bounds = kstDayBoundsUtc(dateStr)
    if (!bounds) {
      return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: rows, error } = await supabase
      .from('notifications')
      .select('id, user_id, title, content, type, is_read, created_at')
      .gte('created_at', bounds.fromIso)
      .lt('created_at', bounds.toIso)
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) {
      console.error('[admin/notifications GET]', error)
      return NextResponse.json({ error: '알림 조회에 실패했습니다.' }, { status: 500 })
    }

    const list = rows || []
    const userIds = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)))
    const profileMap: Record<string, { name: string | null; phone: string | null }> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users')
        .select('id, name, phone')
        .in('id', userIds)

      for (const p of profiles || []) {
        profileMap[(p as { id: string }).id] = {
          name: (p as { name: string | null }).name ?? null,
          phone: (p as { phone: string | null }).phone ?? null,
        }
      }
    }

    const notifications = list.map((r) => ({
      ...r,
      recipient_name: profileMap[r.user_id]?.name ?? null,
      recipient_phone: profileMap[r.user_id]?.phone ?? null,
    }))

    return NextResponse.json({
      date: dateStr,
      count: notifications.length,
      notifications,
    })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/notifications GET', error)
  }
}
