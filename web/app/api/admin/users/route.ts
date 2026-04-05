import { NextRequest, NextResponse } from 'next/server'
import { serverErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import {
  signupMethodCodeFromAuthUser,
  signupMethodLabelKo,
} from '@/lib/admin/signup-method'

// GET: 관리자가 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

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
          return serverErrorResponse('admin users listUsers', usersError)
        }

        if (usersData && usersData.users) {
          allUsers = [...allUsers, ...usersData.users]
          hasMore = usersData.users.length === perPage
          page++
        } else {
          hasMore = false
        }
      } catch (error: unknown) {
        return serverErrorResponse('admin users listUsers page', error)
      }
    }

    // users 테이블에서 추가 정보 조회 (이름, 전화번호 등)
    const userIds = allUsers.map(u => u.id)
    let userProfiles: Record<string, any> = {}
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users')
        .select('id, name, phone, status, username')
        .in('id', userIds)
      
      if (profiles) {
        profiles.forEach((p: any) => {
          userProfiles[p.id] = p
        })
      }
    }

    // 활성(active) 프로필만 — 알림·포인트 등 운영 대상과 맞춤 (pending/deleted·미가입 프로필 제외)
    const users = allUsers
      .filter((user: any) => userProfiles[user.id]?.status === 'active')
      .map((user: any) => {
        const methodCode = signupMethodCodeFromAuthUser(user)
        return {
          id: user.id,
          email: user.email ?? null,
          username: userProfiles[user.id]?.username ?? null,
          name: userProfiles[user.id]?.name || user.user_metadata?.name || null,
          phone: userProfiles[user.id]?.phone || user.user_metadata?.phone || null,
          created_at: user.created_at,
          signup_method: signupMethodLabelKo(methodCode),
        }
      })

    return NextResponse.json({ users })
  } catch (error: unknown) {
    return unknownErrorResponse('admin users GET', error)
  }
}

