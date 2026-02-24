import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getUserFromRequest } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        requiresPhoneVerification: false,
        nameMissing: false,
        status: null,
      })
    }

    const supabase = createSupabaseServerClient()
    const { data: profile } = await supabase
      .from('users')
      .select('phone, phone_verified_at, name, status')
      .eq('id', user.id)
      .maybeSingle()

    const requiresPhoneVerification = !profile?.phone || !profile?.phone_verified_at

    return NextResponse.json({
      authenticated: true,
      requiresPhoneVerification,
      nameMissing: !profile?.name,
      status: profile?.status || 'pending',
    })
  } catch (error: any) {
    console.error('온보딩 상태 조회 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
