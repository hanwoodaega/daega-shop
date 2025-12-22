import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// GET: 포인트 히스토리 조회
export async function GET(request: NextRequest) {
  try {
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // RLS 우회를 위해 admin client 사용 (다른 API와 동일한 방식)
    const supabase = createSupabaseAdminClient()

    // 포인트 히스토리 조회
    const { data: history, error } = await supabase
      .from('point_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('포인트 히스토리 조회 실패:', error)
      return NextResponse.json({ 
        error: '포인트 히스토리 조회 실패',
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ history: history || [] })
  } catch (error: any) {
    console.error('포인트 히스토리 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}


