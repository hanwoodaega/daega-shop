import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// GET: 저장된 결제 카드 목록 조회
export async function GET(_request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

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

    const cards = (data || []).map((card: any) => ({
      id: card.id,
      card_number: card.card_number || null,
      card_company: card.card_company || null,
      is_default: card.is_default || false,
      created_at: card.created_at,
    }))

    return NextResponse.json({ cards })
  } catch (error: any) {
    console.error('결제 카드 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// POST: 결제 카드 추가 (직접 등록 금지)
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: '카드 등록은 토스페이먼츠 인증 절차를 통해서만 가능합니다.' },
    { status: 405 }
  )
}

