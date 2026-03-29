import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// PUT: 기본 배송지로 설정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    // 기존 기본 배송지 해제
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)

    // 선택한 배송지를 기본 배송지로 설정
    const { data, error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', user.id) // 본인 주소만 수정 가능
      .select()
      .single()

    if (error) {
      return dbErrorResponse('addresses/[id]/default PUT', error)
    }

    return NextResponse.json({ address: data })
  } catch (error: unknown) {
    return unknownErrorResponse('addresses/[id]/default PUT', error)
  }
}


