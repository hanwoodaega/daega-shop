import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

// GET: 관리자가 모든 사용자의 포인트 정보 조회
export async function GET(request: NextRequest) {
  try {
    try { 
      assertAdmin() 
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    
    const { data: pointsData, error } = await supabase
      .from('user_points')
      .select('user_id, total_points, purchase_count')

    if (error) {
      console.error('포인트 정보 조회 실패:', error)
      return NextResponse.json({ error: '포인트 정보 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ points: pointsData || [] })
  } catch (error) {
    console.error('포인트 정보 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}


