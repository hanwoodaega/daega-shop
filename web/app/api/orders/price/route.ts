import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { calculateOrderPricing, OrderInput } from '@/lib/order/order-pricing.server'
import { toPricingResponse } from '@/lib/order/pricing-types'

/**
 * 결제 전 금액만 계산 (draft 생성 없음).
 * 장바구니/체크아웃에서 서버 계산 결과를 표시할 때 사용.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()

    const { orderInput } = await request.json()
    if (!orderInput) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { pricing, itemSnapshots } = await calculateOrderPricing({
      supabaseAdmin,
      userId: user?.id ?? null,
      input: orderInput as OrderInput,
    })

    return NextResponse.json({
      pricing: toPricingResponse(pricing),
      itemSnapshots,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
