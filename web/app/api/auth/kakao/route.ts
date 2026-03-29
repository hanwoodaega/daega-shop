import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { normalizeKakaoStylePhoneToKrDigits } from '@/lib/phone/kr'

const PROVIDER = 'kakao'
const OAUTH_EMAIL_DOMAIN = 'provider.local'
const PROFILE_REFRESH_TTL_MS = 24 * 60 * 60 * 1000

const buildOauthEmail = (providerUserId: string) => {
  return `${PROVIDER}_${providerUserId}@${OAUTH_EMAIL_DOMAIN}`
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

type CreateOrGetUserFromOAuthResult = {
  user_id: string
  status: string
  phone: string | null
  phone_verified_at: string | null
  was_deleted: boolean
  linked_existing: boolean
  should_refresh: boolean
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

  const name = profile?.nickname || null
  const phoneNumber = normalizeKakaoStylePhoneToKrDigits(kakaoAccount?.phone_number)

  const supabaseAdmin = createSupabaseAdminClient()

  let userId: string | null = null
  let linkedExisting = false
  let wasDeleted = false
  let requiresPhoneVerification = false
  let shouldRefreshProfile = false

  const oauthEmail = buildOauthEmail(providerUserId)
  let authUserId: string | null = null
  let createdTempUserId: string | null = null

  const { data: existingIdentity } = await supabaseAdmin
    .from('oauth_identities')
    .select('user_id')
    .eq('provider', PROVIDER)
    .eq('provider_user_id', providerUserId)
    .maybeSingle()

  if (existingIdentity?.user_id) {
    authUserId = existingIdentity.user_id
  } else {
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: oauthEmail,
      email_confirm: true,
      user_metadata: {
        provider: PROVIDER,
        provider_user_id: providerUserId,
        name,
      },
    })

    if (createError || !createdUser?.user?.id) {
      const isAlreadyRegistered =
        createError?.message?.toLowerCase().includes('already been registered') ||
        createError?.message?.toLowerCase().includes('already exists')
      if (isAlreadyRegistered) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        })
        const existingAuth = listData?.users?.find((u) => u.email === oauthEmail)
        if (existingAuth?.id) authUserId = existingAuth.id
      }
      if (!authUserId) {
        const createMessage = createError?.message || ''
        const detail = process.env.NODE_ENV === 'development' && createMessage
          ? ` (create_user: ${createMessage})`
          : ' (create_user)'
        throw createOAuthError('supabase_user_failed', `사용자 생성에 실패했습니다.${detail}`)
      }
    } else {
      authUserId = createdUser.user.id
      createdTempUserId = createdUser.user.id
    }
  }

  const nowIso = new Date().toISOString()
  const { data, error: rpcError } = await supabaseAdmin
    .rpc('create_or_get_user_from_oauth', {
      p_provider: PROVIDER,
      p_provider_user_id: providerUserId,
      p_auth_user_id: authUserId,
      p_name: name,
      p_phone: phoneNumber,
      p_profile_fetched_at: nowIso,
      p_refresh_ttl_seconds: Math.floor(PROFILE_REFRESH_TTL_MS / 1000),
      p_now: nowIso,
    })
    .single()
  const rpcData = data as CreateOrGetUserFromOAuthResult | null

  if (rpcError || !rpcData?.user_id) {
    const rpcMessage = rpcError?.message || ''
    const detail = process.env.NODE_ENV === 'development' && rpcMessage
      ? ` (rpc: ${rpcMessage})`
      : ' (rpc)'
    throw createOAuthError('supabase_user_failed', `소셜 계정 매핑 처리에 실패했습니다.${detail}`)
  }

  userId = rpcData.user_id
  linkedExisting = Boolean(rpcData.linked_existing)
  wasDeleted = Boolean(rpcData.was_deleted)
  requiresPhoneVerification = !rpcData.phone || !rpcData.phone_verified_at
  shouldRefreshProfile = Boolean(rpcData.should_refresh)

  if (createdTempUserId && userId !== createdTempUserId) {
    await Promise.all([
      supabaseAdmin.from('users').delete().eq('id', createdTempUserId),
      supabaseAdmin.auth.admin.deleteUser(createdTempUserId),
    ])
  }

  if (shouldRefreshProfile) {
    const updatePayload: {
      user_metadata: Record<string, string | null>
    } = {
      user_metadata: {
        provider: PROVIDER,
        provider_user_id: providerUserId,
        name,
      },
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload)
    if (updateError) {
      throw createOAuthError('supabase_user_failed', '사용자 정보 업데이트에 실패했습니다. (update_user)')
    }
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
  const authEmail = authUser?.user?.email ?? oauthEmail
  if (!authEmail) {
    throw createOAuthError('magiclink_failed', '로그인할 계정 정보를 찾을 수 없습니다.')
  }

  const safeNextPath = sanitizeNextPath(nextPath)
  let finalNextPath = safeNextPath

  if (wasDeleted) {
    finalNextPath = `/auth/restore?next=${encodeURIComponent(safeNextPath)}`
  } else {
    if (requiresPhoneVerification) {
      finalNextPath = `/auth/onboarding?next=${encodeURIComponent(safeNextPath)}`
    }
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: authEmail,
    options: {
      redirectTo: `${origin}/auth/kakao/callback`,
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
    console.error('Kakao OAuth error:', error)
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
