import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

/**
 * API 라우트에서 사용하는 Supabase 클라이언트 (쿠키 기반 인증)
 * 사용자 인증이 필요한 작업에 사용
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            // Server Component에서는 set이 작동하지 않을 수 있음
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch (error) {
            // Server Component에서는 remove가 작동하지 않을 수 있음
          }
        },
      },
    }
  )
}

/**
 * Service Role Key를 사용하는 Supabase 클라이언트 (관리자 권한)
 * RLS 우회가 필요한 작업에 사용 (주의: 보안 검증 필수)
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

