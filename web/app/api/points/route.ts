import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// GET: 사용자 포인트 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    // 사용자 포인트 조회 (클라이언트는 total_points만 사용)
    const { data: userPoints, error } = await supabase
      .from('user_points')
      .select('total_points, purchase_count')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 레코드가 없으면 초기화
        const { data: newRow, error: insertError } = await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            total_points: 0,
            purchase_count: 0,
          })
          .select('total_points, purchase_count')
          .single()

        if (insertError) {
          return dbErrorResponse('points GET init insert', insertError)
        }

        return NextResponse.json({
          userPoints: { total_points: newRow?.total_points ?? 0, purchase_count: newRow?.purchase_count ?? 0 }
        })
      }

      return dbErrorResponse('points GET', error)
    }

    return NextResponse.json({
      userPoints: { total_points: userPoints?.total_points ?? 0, purchase_count: userPoints?.purchase_count ?? 0 }
    })
  } catch (error: unknown) {
    return unknownErrorResponse('points GET', error)
  }
}

