import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Supabase에서 에러를 반환한 경우
  if (error) {
    console.error('Supabase callback error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(errorDescription || '인증에 실패했습니다.')}`,
        request.url
      )
    )
  }

  if (code) {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Code exchange failed:', {
          message: exchangeError.message,
          status: exchangeError.status,
          code: exchangeError.code,
        })
        
        // 에러 타입에 따라 다른 메시지 표시
        let errorMessage = '인증에 실패했습니다.'
        if (exchangeError.message?.includes('expired') || exchangeError.message?.includes('만료')) {
          errorMessage = '인증 링크가 만료되었습니다. 비밀번호 찾기를 다시 시도해 주세요.'
        } else if (exchangeError.message?.includes('invalid') || exchangeError.message?.includes('유효하지')) {
          errorMessage = '유효하지 않은 인증 링크입니다. 비밀번호 찾기를 다시 시도해 주세요.'
        }
        
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, request.url)
        )
      }

      if (session?.user) {
        try {
          const { createSupabaseAdminClient } = await import('@/lib/supabase-server')
          const supabaseAdmin = createSupabaseAdminClient()
          
          await supabaseAdmin
            .from('users')
            .upsert({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || null,
              birthday: session.user.user_metadata?.birthday || null,
              updated_at: new Date().toISOString(),
            })
        } catch (e) {
          console.error('Profile sync error:', e)
          // 프로필 동기화 실패해도 로그인 플로우는 계속 진행
        }
      }
    } catch (error: any) {
      console.error('Unexpected error in callback:', error)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent('예기치 않은 오류가 발생했습니다.')}`, request.url)
      )
    }
  }

  // 코드가 없거나 세션이 생성되지 않은 경우에도 next로 리다이렉트
  const redirectUrl = new URL(next, request.url)
  return NextResponse.redirect(redirectUrl)
}

