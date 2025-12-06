import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// PUT: 기본 배송지로 설정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

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
      .eq('id', params.id)
      .eq('user_id', user.id) // 본인 주소만 수정 가능
      .select()
      .single()

    if (error) {
      console.error('기본 배송지 설정 실패:', error)
      return NextResponse.json({ error: '기본 배송지 설정 실패' }, { status: 500 })
    }

    return NextResponse.json({ address: data })
  } catch (error: any) {
    console.error('기본 배송지 설정 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

