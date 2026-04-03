import { NextRequest, NextResponse } from 'next/server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getUserFromRequest } from '@/lib/auth/auth-server'
import { fetchCartItemsForUser } from '@/lib/cart/cart-service'
import { buildServerTimingHeader } from '@/lib/utils/server-timing'

export const dynamic = 'force-dynamic'

type BootstrapSyncResult = {
  done: boolean
  count: number
  items: any[]
}

const SYNC_TIMEOUT_MS = 1200

const withTimeout = async <T,>(task: Promise<T>, timeoutMs: number) => {
  let timeoutId: NodeJS.Timeout | null = null
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs)
  })
  const result = await Promise.race([task, timeoutPromise])
  if (timeoutId) clearTimeout(timeoutId)
  return result
}

const buildEmptySync = (): { cart: BootstrapSyncResult; wishlist: BootstrapSyncResult } => ({
  cart: { done: false, count: 0, items: [] },
  wishlist: { done: false, count: 0, items: [] },
})

export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const includeSync = request.nextUrl.searchParams.get('includeSync') === 'true'
      || request.nextUrl.searchParams.get('includeSync') === '1'

    const user = await getUserFromRequest(request)
    const tAuth = Date.now()
    if (!user) {
      const headers = new Headers()
      headers.set(
        'Server-Timing',
        buildServerTimingHeader([
          { name: 'auth', durMs: tAuth - t0 },
          { name: 'total', durMs: Date.now() - t0 },
        ])
      )
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          onboarding: null,
          sync: buildEmptySync(),
        },
        { headers }
      )
    }

    const supabase = await createSupabaseServerClient()
    const { data: profile } = await supabase
      .from('users')
      .select('phone, phone_verified_at, name, status')
      .eq('id', user.id)
      .maybeSingle()
    const tProfile = Date.now()

    const status = profile?.status || 'pending'
    const requiresPhoneVerification = !profile?.phone || !profile?.phone_verified_at
    const nameMissing = !profile?.name
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

    const baseResponse = {
      authenticated: true,
      user: { id: user.id, status },
      onboarding: {
        status,
        requiresPhoneVerification,
        nameMissing,
        termsRequired,
      },
    }

    if (!includeSync || status !== 'active') {
      const headers = new Headers()
      headers.set(
        'Server-Timing',
        buildServerTimingHeader([
          { name: 'auth', durMs: tAuth - t0 },
          { name: 'profile', durMs: tProfile - tAuth },
          { name: 'total', durMs: Date.now() - t0 },
        ])
      )
      return NextResponse.json(
        {
          ...baseResponse,
          sync: buildEmptySync(),
        },
        { headers }
      )
    }

    // includeSync=1: 요청 본문은 사용하지 않음(과거 로컬 merge 제거됨). DB만 조회.
    const syncTask = async () => {
      const cartItems = await fetchCartItemsForUser(supabase, user.id)
      const { data: wishlistRows } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user.id)

      const wishlistItems = (wishlistRows || []).map((row: any) => row.product_id)

      return {
        cart: { done: true, count: cartItems.length, items: cartItems },
        wishlist: { done: true, count: wishlistItems.length, items: wishlistItems },
      }
    }

    const syncResult = await withTimeout(syncTask(), SYNC_TIMEOUT_MS)
    const tSync = Date.now()
    if (!syncResult) {
      const headers = new Headers()
      headers.set(
        'Server-Timing',
        buildServerTimingHeader([
          { name: 'auth', durMs: tAuth - t0 },
          { name: 'profile', durMs: tProfile - tAuth },
          { name: 'sync', durMs: tSync - tProfile },
          { name: 'total', durMs: Date.now() - t0 },
        ])
      )
      return NextResponse.json({
        ...baseResponse,
        sync: buildEmptySync(),
      }, { headers })
    }

    const headers = new Headers({
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    })
    headers.set(
      'Server-Timing',
      buildServerTimingHeader([
        { name: 'auth', durMs: tAuth - t0 },
        { name: 'profile', durMs: tProfile - tAuth },
        { name: 'sync', durMs: tSync - tProfile },
        { name: 'total', durMs: Date.now() - t0 },
      ])
    )
    return NextResponse.json(
      { ...baseResponse, sync: syncResult },
      { headers }
    )
  } catch (error: unknown) {
    const headers = new Headers()
    headers.set('Server-Timing', buildServerTimingHeader([{ name: 'total', durMs: Date.now() - t0 }]))
    return unknownErrorResponse('auth/bootstrap', error, headers)
  }
}
