import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// GET: 저장된 결제 카드 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 결제 카드 조회
    const { data, error } = await supabase
      .from('payment_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      // 테이블이 없는 경우 빈 배열 반환
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('payment_cards 테이블이 존재하지 않습니다.')
        return NextResponse.json({ cards: [] })
      }
      console.error('결제 카드 조회 실패:', error)
      return NextResponse.json({ error: '결제 카드 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ cards: data || [] })
  } catch (error: any) {
    console.error('결제 카드 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// POST: 결제 카드 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { card_number, card_holder, expiry_month, expiry_year, is_default } = body

    // 기본 카드로 설정하는 경우, 기존 기본 카드 해제
    if (is_default) {
      await supabase
        .from('payment_cards')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    // 결제 카드 추가
    const { data, error } = await supabase
      .from('payment_cards')
      .insert({
        user_id: user.id,
        card_number,
        card_holder,
        expiry_month,
        expiry_year,
        is_default: is_default || false,
      })
      .select()
      .single()

    if (error) {
      console.error('결제 카드 추가 실패:', error)
      return NextResponse.json({ error: '결제 카드 추가 실패' }, { status: 500 })
    }

    return NextResponse.json({ card: data })
  } catch (error: any) {
    console.error('결제 카드 추가 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

