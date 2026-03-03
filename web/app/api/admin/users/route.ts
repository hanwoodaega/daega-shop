import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

// GET: 관리자가 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    try { await assertAdmin() } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    
    // 모든 사용자 조회 (페이지네이션)
    let allUsers: any[] = []
    let page = 1
    const perPage = 1000
    let hasMore = true

    while (hasMore) {
      try {
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        })
        
        if (usersError) {
          console.error('사용자 목록 조회 실패:', usersError)
          return NextResponse.json({ 
            error: `사용자 목록을 불러올 수 없습니다: ${usersError.message || usersError}` 
          }, { status: 500 })
        }

        if (usersData && usersData.users) {
          allUsers = [...allUsers, ...usersData.users]
          hasMore = usersData.users.length === perPage
          page++
        } else {
          hasMore = false
        }
      } catch (error: any) {
        console.error('사용자 목록 조회 중 오류:', error)
        return NextResponse.json({ 
          error: `사용자 목록 조회 중 오류가 발생했습니다: ${error.message || error}` 
        }, { status: 500 })
      }
    }

    // users 테이블에서 추가 정보 조회 (이름, 전화번호 등)
    const userIds = allUsers.map(u => u.id)
    let userProfiles: Record<string, any> = {}
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users')
        .select('id, name, phone')
        .in('id', userIds)
      
      if (profiles) {
        profiles.forEach((p: any) => {
          userProfiles[p.id] = p
        })
      }
    }

    // 사용자 정보 결합
    const users = allUsers.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: userProfiles[user.id]?.name || user.user_metadata?.name || null,
      phone: userProfiles[user.id]?.phone || user.user_metadata?.phone || null,
      created_at: user.created_at,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

