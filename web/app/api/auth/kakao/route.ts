import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

const PROVIDER = 'kakao'
const OAUTH_EMAIL_DOMAIN = 'provider.local'
const PROFILE_REFRESH_TTL_MS = 24 * 60 * 60 * 1000

const buildOauthEmail = (providerUserId: string) => {
  return `${PROVIDER}_${providerUserId}@${OAUTH_EMAIL_DOMAIN}`
}

const normalizePhone = (value?: string | null) => {
  if (!value) return null
  let digits = value.replace(/[^0-9]/g, '')
  if (digits.startsWith('82') && digits.length >= 11) {
    digits = `0${digits.slice(2)}`
  }
  return digits
}

const buildBirthday = (birthday?: string | null, birthyear?: string | null) => {
  if (!birthday) return null
  let formatted = birthday
  if (/^\d{4}$/.test(birthday)) {
    formatted = `${birthday.slice(0, 2)}-${birthday.slice(2)}`
  }
  if (birthyear) {
    return `${birthyear}-${formatted}`
  }
  return `1900-${formatted}`
}

const sanitizeNextPath = (raw?: string | null) => {
  if (!raw || typeof raw !== 'string') return '/'
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return '/'
  if (trimmed.startsWith('//')) return '/'
  if (trimmed.includes('://')) return '/'
  return trimmed
}


type KakaoOAuthError = {
  code: string
  description: string
}

const createOAuthError = (code: string, description: string): KakaoOAuthError => ({
  code,
  description,
})

async function processKakaoOAuth(params: {
  request: NextRequest
  code?: string | null
  state?: string | null
  nextPath?: string | null
}) {
  const { request, code, state, nextPath } = params

  if (!code || !state) {
    throw createOAuthError('missing_code', '로그인 정보가 없습니다.')
  }

  const stateCookie = request.cookies.get('kakao_oauth_state')?.value
  if (!stateCookie || stateCookie !== state) {
    throw createOAuthError('state_mismatch', '요청이 만료되었거나 유효하지 않습니다.')
  }

  const clientId =
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || process.env.NEXT_PUBLIC_KAKAO_APP_KEY
  const clientSecret = process.env.KAKAO_CLIENT_SECRET
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/kakao`

  if (!clientId) {
    throw createOAuthError('token_exchange_failed', '카카오 로그인이 설정되지 않았습니다.')
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw createOAuthError('supabase_user_failed', '서버 인증 설정이 누락되었습니다.')
  }

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
  })
  if (clientSecret) {
    tokenBody.set('client_secret', clientSecret)
  }

  const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenBody,
  })

  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok || !tokenData.access_token) {
    throw createOAuthError(
      'token_exchange_failed',
      tokenData?.error_description || '액세스 토큰을 받지 못했습니다.'
    )
  }

  const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  })

  const userData = await userResponse.json()

  if (!userResponse.ok || !userData?.id) {
    throw createOAuthError('kakao_userinfo_failed', '사용자 정보를 가져오지 못했습니다.')
  }

  const providerUserId = String(userData.id)
  const kakaoAccount = userData?.kakao_account || {}
  const profile = kakaoAccount?.profile || {}

  const kakaoEmail = kakaoAccount?.email?.trim()?.toLowerCase() || null
  const name = profile?.nickname || null
  const avatarUrl = profile?.profile_image_url || null
  const phoneNumber = normalizePhone(kakaoAccount?.phone_number)
  const birthday = buildBirthday(kakaoAccount?.birthday, kakaoAccount?.birthyear)

  const supabaseAdmin = createSupabaseAdminClient()

  const { data: identity, error: identityError } = await supabaseAdmin
    .from('oauth_identities')
    .select('user_id, email, profile_fetched_at')
    .eq('provider', PROVIDER)
    .eq('provider_user_id', providerUserId)
    .maybeSingle()

  if (identityError) {
    throw createOAuthError('supabase_user_failed', '소셜 계정 매핑 조회에 실패했습니다. (identity_lookup)')
  }

  const hasIdentity = Boolean(identity?.user_id)
  const lastFetchedAt = identity?.profile_fetched_at
    ? new Date(identity.profile_fetched_at).getTime()
    : 0
  const shouldRefreshProfile = !hasIdentity || Date.now() - lastFetchedAt > PROFILE_REFRESH_TTL_MS
  let userId = identity?.user_id
  let linkedExisting = false

  if (!userId && phoneNumber) {
    const { data: phoneOwner } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phoneNumber)
      .maybeSingle()
    if (phoneOwner?.id) {
      userId = phoneOwner.id
      linkedExisting = true
    }
  }

  // 이메일로는 자동 병합하지 않음 (휴대폰 인증 단계에서 병합)

  if (!userId) {
    const oauthEmail = buildOauthEmail(providerUserId)
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: oauthEmail,
      email_confirm: true,
      user_metadata: {
        provider: PROVIDER,
        provider_user_id: providerUserId,
        name,
        avatar_url: avatarUrl,
      },
    })

    if (createError || !createdUser?.user?.id) {
      const createMessage = createError?.message || ''
      const detail = process.env.NODE_ENV === 'development' && createMessage
        ? ` (create_user: ${createMessage})`
        : ' (create_user)'
      throw createOAuthError('supabase_user_failed', `사용자 생성에 실패했습니다.${detail}`)
    } else {
      userId = createdUser.user.id
    }
  }

  const shouldUpdateAuthUser = shouldRefreshProfile
  if (shouldUpdateAuthUser) {
    const updatePayload: {
      user_metadata: Record<string, string | null>
    } = {
      user_metadata: {
        provider: PROVIDER,
        provider_user_id: providerUserId,
        name,
        avatar_url: avatarUrl,
      },
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload)
    if (updateError) {
      throw createOAuthError('supabase_user_failed', '사용자 정보 업데이트에 실패했습니다. (update_user)')
    }
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
  const authEmail = authUser?.user?.email || null
  if (!authEmail) {
    throw createOAuthError('supabase_user_failed', '사용자 이메일 확인에 실패했습니다. (auth_email)')
  }

  const shouldUpsertIdentity = !hasIdentity || identity?.user_id !== userId || shouldRefreshProfile
  if (shouldUpsertIdentity) {
    const identityEmail = kakaoEmail || identity?.email || null
    const profileFetchedAt = shouldRefreshProfile
      ? new Date().toISOString()
      : identity?.profile_fetched_at || null
    const { error: identityUpsertError } = await supabaseAdmin
      .from('oauth_identities')
      .upsert(
        {
          provider: PROVIDER,
          provider_user_id: providerUserId,
          user_id: userId,
          email: identityEmail,
          profile_fetched_at: profileFetchedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider,provider_user_id' }
      )

    if (identityUpsertError) {
      throw createOAuthError('supabase_user_failed', '소셜 계정 매핑 저장에 실패했습니다. (identity_upsert)')
    }
  }

  const { data: profileCheck } = await supabaseAdmin
    .from('users')
    .select('phone, phone_verified_at, status')
    .eq('id', userId)
    .maybeSingle()

  const wasDeleted = profileCheck?.status === 'deleted'

  const shouldUpdateProfile = shouldRefreshProfile
  if (shouldUpdateProfile) {
    const nowIso = new Date().toISOString()
    const profileUpdate: Record<string, string | null> = {
      id: userId,
      updated_at: nowIso,
    }
    if (!wasDeleted) {
      if (name !== null) profileUpdate.name = name
      if (phoneNumber !== null) {
        profileUpdate.phone = phoneNumber
        profileUpdate.phone_verified_at = nowIso
      }
      if (birthday !== null) profileUpdate.birthday = birthday
    }

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert(profileUpdate, { onConflict: 'id' })

    if (profileError) {
      throw createOAuthError('supabase_user_failed', '사용자 프로필 저장에 실패했습니다. (profile_upsert)')
    }
  }

  const safeNextPath = sanitizeNextPath(nextPath)
  let finalNextPath = safeNextPath

  if (wasDeleted) {
    finalNextPath = `/auth/restore?next=${encodeURIComponent(safeNextPath)}`
  } else {
    const requiresPhoneVerification = !profileCheck?.phone || !profileCheck?.phone_verified_at
  const statusValue = requiresPhoneVerification ? 'pending' : 'active'
  if (profileCheck?.status !== statusValue) {
    await supabaseAdmin
      .from('users')
      .update({ status: statusValue })
      .eq('id', userId)
  }

    if (requiresPhoneVerification || profileCheck?.status === 'pending') {
      finalNextPath = `/auth/onboarding?next=${encodeURIComponent(safeNextPath)}`
    }
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: authEmail,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (linkError) {
    throw createOAuthError('magiclink_failed', '로그인 링크 생성에 실패했습니다. (magiclink)')
  }

  const tokenHash = linkData?.properties?.hashed_token
  if (!tokenHash) {
    throw createOAuthError('magiclink_failed', '로그인 토큰 생성에 실패했습니다. (magiclink_token)')
  }

  return {
    tokenHash,
    nextPath: finalNextPath,
    linkedExisting,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const nextFromCookie = request.cookies.get('kakao_oauth_next')?.value

  try {
    const { tokenHash, nextPath, linkedExisting } = await processKakaoOAuth({
      request,
      code,
      state,
      nextPath: nextFromCookie,
    })

    const redirectUrl = new URL('/auth/kakao/callback', request.url)
    redirectUrl.searchParams.set('token_hash', tokenHash)
    redirectUrl.searchParams.set('type', 'magiclink')
    if (nextPath) {
      redirectUrl.searchParams.set('next', nextPath)
    }
    if (linkedExisting) {
      redirectUrl.searchParams.set('linked', '1')
    }

    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set('kakao_oauth_state', '', { maxAge: 0, path: '/' })
    response.cookies.set('kakao_oauth_next', '', { maxAge: 0, path: '/' })
    return response
  } catch (error: any) {
    const errorCode = error?.code || 'unknown_error'
    const errorDescription = error?.description || '카카오 로그인 처리 실패'
    const redirectUrl = new URL('/auth/kakao/callback', request.url)
    redirectUrl.searchParams.set('error', errorCode)
    redirectUrl.searchParams.set('error_description', errorDescription)
    const safeNext = sanitizeNextPath(nextFromCookie)
    if (safeNext) {
      redirectUrl.searchParams.set('next', safeNext)
    }
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set('kakao_oauth_state', '', { maxAge: 0, path: '/' })
    response.cookies.set('kakao_oauth_next', '', { maxAge: 0, path: '/' })
    return response
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { tokenHash } = await processKakaoOAuth({
      request,
      code: body?.code,
      state: body?.state,
      nextPath: body?.next,
    })

    return NextResponse.json({
      token_hash: tokenHash,
      type: 'magiclink',
    })
  } catch (error: any) {
    const errorCode = error?.code || 'unknown_error'
    const errorDescription = error?.description || '카카오 로그인 처리 실패'
    return NextResponse.json(
      { error: errorCode, error_description: errorDescription },
      { status: 500 }
    )
  }
}
