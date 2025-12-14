import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// POST: 동일 주소 확인 및 주소 개수 조회
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { address, address_detail } = body

    // 동일 주소 확인
    const { data: existing, error: findError } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', user.id)
      .eq('address', address.trim())
      .eq('address_detail', (address_detail || '').trim() || null)
      .maybeSingle()

    // 주소 개수 조회
    const { count, error: countError } = await supabase
      .from('addresses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return NextResponse.json({
      existing: existing || null,
      addressCount: count || 0,
      error: findError?.message || countError?.message || null
    })
  } catch (error: any) {
    console.error('주소 확인 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류',
      existing: null,
      addressCount: 0
    }, { status: 500 })
  }
}


