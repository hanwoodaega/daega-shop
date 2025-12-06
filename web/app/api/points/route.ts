import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// GET: 사용자 포인트 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 사용자 포인트 조회
    const { data: userPoints, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 레코드가 없으면 초기화
        const { data: newUserPoints, error: insertError } = await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            total_points: 0,
            purchase_count: 0,
          })
          .select()
          .single()

        if (insertError) {
          console.error('포인트 초기화 실패:', insertError)
          return NextResponse.json({ 
            error: '포인트 초기화 실패', 
            details: insertError.message 
          }, { status: 500 })
        }

        return NextResponse.json({ userPoints: newUserPoints })
      }
      
      console.error('포인트 조회 실패:', error)
      return NextResponse.json({ 
        error: '포인트 조회 실패', 
        details: error.message,
        code: error.code 
      }, { status: 500 })
    }

    return NextResponse.json({ userPoints })
  } catch (error: any) {
    console.error('포인트 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

