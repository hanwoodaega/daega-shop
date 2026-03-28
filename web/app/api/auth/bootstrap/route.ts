import { NextRequest, NextResponse } from 'next/server'
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

    const body = await request.json().catch(() => ({}))
    const localCart = Array.isArray(body?.cart) ? body.cart : []
    const localWishlist = Array.isArray(body?.wishlist) ? body.wishlist : []

    const syncTask = async () => {
      if (localWishlist.length > 0) {
        const wishlistRows = localWishlist
          .filter((id: any) => typeof id === 'string' && id.length > 0)
          .map((productId: string) => ({ user_id: user.id, product_id: productId }))

        if (wishlistRows.length > 0) {
          await supabase
            .from('wishlists')
            .upsert(wishlistRows, { onConflict: 'user_id,product_id' })
        }
      }

      if (localCart.length > 0) {
        const { data: existingRows } = await supabase
          .from('carts')
          .select('id, product_id, quantity, promotion_group_id, discount_percent')
          .eq('user_id', user.id)

        const existingByKey = new Map<string, any>()
        ;(existingRows || []).forEach((row: any) => {
          const key = `${row.product_id}::${row.promotion_group_id || ''}`
          existingByKey.set(key, row)
        })

        for (const item of localCart) {
          const productId = item?.productId
          const quantity = Number(item?.quantity || 0)
          if (!productId || quantity <= 0) continue

          const promotionGroupId = item?.promotion_group_id || null
          const key = `${productId}::${promotionGroupId || ''}`
          const existing = existingByKey.get(key)

          if (existing) {
            const newQty = (existing.quantity || 0) + quantity
            await supabase
              .from('carts')
              .update({
                quantity: newQty,
                discount_percent: item?.discount_percent ?? existing.discount_percent ?? null,
              })
              .eq('id', existing.id)
            existingByKey.set(key, { ...existing, quantity: newQty })
          } else if (promotionGroupId) {
            const { data: inserted } = await supabase
              .from('carts')
              .insert({
                user_id: user.id,
                product_id: productId,
                quantity,
                promotion_group_id: promotionGroupId,
                promotion_type: item?.promotion_type || null,
                discount_percent: item?.discount_percent ?? null,
              })
              .select('id, product_id, quantity, promotion_group_id')
              .single()
            if (inserted) existingByKey.set(key, inserted)
          } else {
            const { data: inserted } = await supabase
              .from('carts')
              .insert({
                user_id: user.id,
                product_id: productId,
                quantity,
                discount_percent: item?.discount_percent ?? null,
              })
              .select('id, product_id, quantity, promotion_group_id')
              .single()
            if (inserted) existingByKey.set(key, inserted)
          }
        }
      }

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
  } catch (error: any) {
    console.error('부트스트랩 처리 오류:', error)
    const headers = new Headers()
    headers.set('Server-Timing', buildServerTimingHeader([{ name: 'total', durMs: Date.now() - t0 }]))
    return NextResponse.json({ error: error?.message || '서버 오류' }, { status: 500, headers })
  }
}
