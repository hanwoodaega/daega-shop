import { createSupabaseServerClient } from '../supabase/supabase-server'
import { User } from '@supabase/supabase-js'

/**
 * 서버에서 사용자 인증 정보를 가져오는 헬퍼 함수
 * 모든 API 라우트에서 재사용 가능
 * 
 * @returns 사용자 정보 또는 null (인증 실패 시)
 */
export async function getUserFromServer(): Promise<User | null> {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return user
  } catch (error) {
    console.error('getUserFromServer 오류:', error)
    return null
  }
}

type ActiveUserResult =
  | { user: User }
  | { error: 'unauthorized' | 'forbidden' }

export async function requireActiveUserFromServer(): Promise<ActiveUserResult> {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { error: 'unauthorized' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('사용자 상태 조회 실패:', profileError)
      return { error: 'forbidden' }
    }

    if (!profile || profile.status !== 'active') {
      return { error: 'forbidden' }
    }

    return { user }
  } catch (error) {
    console.error('requireActiveUserFromServer 오류:', error)
    return { error: 'unauthorized' }
  }
}

