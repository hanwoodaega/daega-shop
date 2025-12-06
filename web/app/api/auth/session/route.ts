import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 현재 인증 세션 확인
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 세션 확인
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('세션 확인 실패:', error)
      return NextResponse.json({ 
        user: null, 
        error: error.message 
      }, { status: 200 }) // 에러여도 200 반환 (세션이 없는 것일 수 있음)
    }
    
    return NextResponse.json({
      user: session?.user ?? null,
      session: session ? {
        access_token: session.access_token,
        expires_at: session.expires_at,
      } : null
    })
  } catch (error: any) {
    console.error('세션 확인 오류:', error)
    return NextResponse.json({ 
      user: null, 
      error: error?.message || '알 수 없는 오류'
    }, { status: 200 })
  }
}

