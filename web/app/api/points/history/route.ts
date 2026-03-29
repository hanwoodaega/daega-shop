import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// GET: 포인트 히스토리 조회
export async function GET(request: NextRequest) {
  try {
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // RLS 우회를 위해 admin client 사용 (다른 API와 동일한 방식)
    const supabase = createSupabaseAdminClient()

    // 포인트 히스토리 조회 (목록 표시에 필요한 필드만)
    const { data: history, error } = await supabase
      .from('point_history')
      .select('id, type, description, points, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return dbErrorResponse('points/history GET', error)
    }
    
    return NextResponse.json({ history: history || [] })
  } catch (error: unknown) {
    return unknownErrorResponse('points/history GET', error)
  }
}


