import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { calculateOrderPricing } from '@/lib/order/order-pricing.server'
import { toPricingResponse } from '@/lib/order/pricing-types'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { draftPostBodySchema, normalizeToOrderInput } from '@/lib/validation/schemas/order-payment'

/**
 * 결제 전 금액만 계산 (draft 생성 없음).
 * 장바구니/체크아웃에서 서버 계산 결과를 표시할 때 사용.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()

    const parsed = await parseJsonBody(request, draftPostBodySchema)
    if (!parsed.ok) return parsed.response

    const orderInput = normalizeToOrderInput(parsed.data.orderInput)

    const supabaseAdmin = createSupabaseAdminClient()
    const { pricing, itemSnapshots } = await calculateOrderPricing({
      supabaseAdmin,
      userId: user?.id ?? null,
      input: orderInput,
    })

    return NextResponse.json({
      pricing: toPricingResponse(pricing),
      itemSnapshots,
    })
  } catch (error: unknown) {
    return unknownErrorResponse('orders/price', error)
  }
}
