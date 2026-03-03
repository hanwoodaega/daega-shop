import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getUserFromRequest } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// GET: 현재 인증 세션 확인
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const user = await getUserFromRequest(request)
    if (!user) {
      // 사용자가 없거나 인증 실패 시
      return NextResponse.json({
        user: null,
        session: null
      })
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('status, phone, phone_verified_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({
        user: null,
        session: null,
        status: null,
      })
    }

    const requiresPhoneVerification = !profile?.phone || !profile?.phone_verified_at
    if (profile?.status !== 'active' || requiresPhoneVerification) {
      return NextResponse.json({
        user: null,
        session: null,
        status: profile?.status || 'pending',
      })
    }

    // 사용자 정보가 있으면 세션 정보도 가져오기 (토큰 정보 필요 시)
    // getUser()로 인증된 사용자만 세션 정보 제공
    const { data: { session } } = await supabase.auth.getSession()
    
    return NextResponse.json({
      user: user,
      session: session ? {
        access_token: session.access_token,
        expires_at: session.expires_at,
      } : null,
      status: profile?.status || 'active',
    })
  } catch (error: any) {
    console.error('세션 확인 오류:', error)
    return NextResponse.json({ 
      user: null,
      session: null,
      status: null,
      error: error?.message || '알 수 없는 오류'
    }, { status: 200 })
  }
}


