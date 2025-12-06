import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// DELETE: 결제 카드 삭제
export async function DELETE(
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

    // 결제 카드 삭제 (본인 카드만 삭제 가능)
    const { error } = await supabase
      .from('payment_cards')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('결제 카드 삭제 실패:', error)
      return NextResponse.json({ error: '결제 카드 삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('결제 카드 삭제 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// PUT: 결제 카드를 기본 카드로 설정
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

    // 기존 기본 카드 해제
    await supabase
      .from('payment_cards')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)

    // 선택한 카드를 기본 카드로 설정
    const { data, error } = await supabase
      .from('payment_cards')
      .update({ is_default: true })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('기본 카드 설정 실패:', error)
      return NextResponse.json({ error: '기본 카드 설정 실패' }, { status: 500 })
    }

    return NextResponse.json({ card: data })
  } catch (error: any) {
    console.error('기본 카드 설정 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

