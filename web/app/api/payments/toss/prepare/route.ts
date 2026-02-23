import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'
import { calculateOrderPricing, OrderInput } from '@/lib/order/order-pricing.server'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const { orderInput } = await request.json()
    if (!orderInput) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { pricing } = await calculateOrderPricing({
      supabaseAdmin,
      userId: user.id,
      input: orderInput as OrderInput,
    })

    return NextResponse.json({
      amount: pricing.finalTotal,
      pricing,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
