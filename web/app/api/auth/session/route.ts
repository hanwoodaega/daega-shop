import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 현재 인증 세션 확인
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 보안을 위해 getUser() 사용 (서버 측 인증 확인)
    // getSession()은 클라이언트 쿠키에서 직접 읽어오므로 위조 가능
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      // 사용자가 없거나 인증 실패 시
      return NextResponse.json({
        user: null,
        session: null
      })
    }
    
    // 사용자 정보가 있으면 세션 정보도 가져오기 (토큰 정보 필요 시)
    // getUser()로 인증된 사용자만 세션 정보 제공
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    return NextResponse.json({
      user: user,
      session: session ? {
        access_token: session.access_token,
        expires_at: session.expires_at,
      } : null
    })
  } catch (error: any) {
    console.error('세션 확인 오류:', error)
    return NextResponse.json({ 
      user: null,
      session: null,
      error: error?.message || '알 수 없는 오류'
    }, { status: 200 })
  }
}

