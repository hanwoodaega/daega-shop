import { NextRequest, NextResponse } from 'next/server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getUserFromRequest } from '@/lib/auth/auth-server'
import { deriveAuthState, getPostAuthRedirect } from '@/lib/auth/auth-state'
import { buildServerTimingHeader } from '@/lib/utils/server-timing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const marks: Array<{ name: string; at: number }> = [{ name: 'start', at: t0 }]
  try {
    const nextPath = request.nextUrl.searchParams.get('next') || '/'

    const user = await getUserFromRequest(request)
    marks.push({ name: 'auth', at: Date.now() })
    if (!user) {
      const state = deriveAuthState({
        authenticated: false,
        status: null,
        requiresPhoneVerification: false,
      })
      const headers = new Headers()
      headers.set(
        'Server-Timing',
        buildServerTimingHeader([
          { name: 'auth', durMs: marks[marks.length - 1].at - t0 },
          { name: 'total', durMs: Date.now() - t0 },
        ])
      )
      return NextResponse.json(
        {
        authenticated: false,
        state,
        redirectTo: getPostAuthRedirect({ state, nextPath }),
        },
        { headers }
      )
    }

    const supabase = await createSupabaseServerClient()
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('phone, phone_verified_at, name, status')
      .eq('id', user.id)
      .maybeSingle()
    marks.push({ name: 'profile', at: Date.now() })

    if (profileError) {
      const headers = new Headers()
      headers.set(
        'Server-Timing',
        buildServerTimingHeader([
          { name: 'auth', durMs: (marks.find((m) => m.name === 'auth')?.at ?? t0) - t0 },
          { name: 'profile', durMs: Date.now() - (marks.find((m) => m.name === 'auth')?.at ?? t0) },
          { name: 'total', durMs: Date.now() - t0 },
        ])
      )
      return NextResponse.json(
        { error: '사용자 상태 조회에 실패했습니다.' },
        { status: 500, headers }
      )
    }

    const requiresPhoneVerification = !profile?.phone || !profile?.phone_verified_at
    const metadataProvider = (user.user_metadata as any)?.provider
    const appProvider = (user as any)?.app_metadata?.provider
    const provider = metadataProvider || appProvider || 'phone'
    const isSocialProvider = provider === 'kakao' || provider === 'naver'
    const requiredTerms = ['service', 'privacy', 'third_party', 'age14']
    let termsRequired = false

    if (isSocialProvider && requiresPhoneVerification) {
      const { data: termsRows, error: termsError } = await supabase
        .from('user_terms')
        .select('terms_type, agreed')
        .eq('user_id', user.id)
        .in('terms_type', requiredTerms)

      if (termsError) {
        console.error('약관 동의 조회 실패:', termsError)
        termsRequired = true
      } else {
        const agreedByType = new Map<string, boolean>()
        ;(termsRows || []).forEach((row: any) => {
          if (row?.terms_type) {
            agreedByType.set(row.terms_type, row.agreed === true)
          }
        })
        termsRequired = requiredTerms.some((type) => !agreedByType.get(type))
      }
    }
    const state = deriveAuthState({
      authenticated: true,
      status: profile?.status || 'pending',
      requiresPhoneVerification,
      termsRequired,
      nameMissing: !profile?.name,
    })

    const headers = new Headers()
    const authAt = marks.find((m) => m.name === 'auth')?.at ?? t0
    const profileAt = marks.find((m) => m.name === 'profile')?.at ?? Date.now()
    headers.set(
      'Server-Timing',
      buildServerTimingHeader([
        { name: 'auth', durMs: authAt - t0 },
        { name: 'profile', durMs: profileAt - authAt },
        { name: 'total', durMs: Date.now() - t0 },
      ])
    )
    return NextResponse.json(
      {
        authenticated: true,
        state,
        redirectTo: getPostAuthRedirect({ state, nextPath }),
      },
      { headers }
    )
  } catch (error: unknown) {
    const headers = new Headers()
    headers.set('Server-Timing', buildServerTimingHeader([{ name: 'total', durMs: Date.now() - t0 }]))
    return unknownErrorResponse('auth/finalize', error, headers)
  }
}

