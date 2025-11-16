import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code)

    // 세션이 생겼다면 유저 메타데이터를 users 테이블로 동기화
    if (sessionData?.user) {
      const authUser = sessionData.user
      const metadata: any = authUser.user_metadata || {}
      const name = metadata.name || null
      const birthday = metadata.birthday || null
      const email = authUser.email || null

      try {
        await supabase
          .from('users')
          .upsert({
            id: authUser.id,
            email,
            name,
            birthday, // YYYY-MM-DD 또는 null
            updated_at: new Date().toISOString(),
          })
      } catch (e) {
        // 실패하더라도 로그인 플로우는 막지 않음
        console.error('Failed to upsert user profile on callback:', e)
      }
    }
  }

  // 로그인 후 next로 리다이렉트
  return NextResponse.redirect(new URL(next, request.url))
}

