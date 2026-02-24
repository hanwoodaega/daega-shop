import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromRequest } from '@/lib/auth/auth-server'


export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('복구 상태 조회 실패:', profileError)
      return NextResponse.json({ error: '사용자 상태 조회에 실패했습니다.' }, { status: 500 })
    }

    if (profile?.status !== 'deleted') {
      return NextResponse.json({ restored: false })
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        status: 'pending',
        name: null,
        phone: null,
        phone_verified_at: null,
        restored_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('계정 복구 업데이트 실패:', updateError)
      return NextResponse.json(
        { error: '계정 복구 처리에 실패했습니다.', detail: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ restored: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
