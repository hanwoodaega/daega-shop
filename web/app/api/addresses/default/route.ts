import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// GET: 기본 주소 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 기본 주소 조회
    const { data: defaultAddr, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('기본 주소 조회 실패:', error)
      return NextResponse.json({ error: '기본 주소 조회 실패' }, { status: 500 })
    }

    // 기본 주소가 없으면 첫 번째 주소 조회
    if (!defaultAddr) {
      const { data: firstAddr } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return NextResponse.json({ 
        address: firstAddr || null,
        hasDefaultAddress: !!firstAddr
      })
    }

    return NextResponse.json({ 
      address: defaultAddr,
      hasDefaultAddress: true
    })
  } catch (error: any) {
    console.error('기본 주소 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

