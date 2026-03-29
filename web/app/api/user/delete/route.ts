import { NextRequest, NextResponse } from 'next/server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: profile } = await supabase
      .from('users')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle()

    const { error } = await supabase
      .from('users')
      .update({
        status: 'deleted',
        name: null,
        phone: profile?.phone || null,
        phone_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('탈퇴 처리 실패:', error)
      return NextResponse.json({ error: '탈퇴 처리에 실패했습니다.' }, { status: 500 })
    }

    const { error: cartsError } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', user.id)

    if (cartsError) {
      console.error('탈퇴 시 장바구니 삭제 실패:', cartsError)
    }

    const { error: wishlistError } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)

    if (wishlistError) {
      console.error('탈퇴 시 위시리스트 삭제 실패:', wishlistError)
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (accessToken) {
        await supabaseAdmin.auth.admin.signOut(accessToken, 'global')
      }
    } catch (signOutError) {
      console.error('탈퇴 후 세션 무효화 실패:', signOutError)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('user/delete', error)
  }
}
