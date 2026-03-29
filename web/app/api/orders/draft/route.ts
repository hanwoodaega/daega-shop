import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { calculateOrderPricing } from '@/lib/order/order-pricing.server'
import { toPricingResponse } from '@/lib/order/pricing-types'
import { DRAFT_EXPIRY_MINUTES } from '@/lib/utils/constants'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { draftPostBodySchema, normalizeToOrderInput } from '@/lib/validation/schemas/order-payment'

/**
 * 결제 전 주문 초안(draft) 생성.
 * 반환된 orderId를 토스 결제/confirm에 사용. 서버가 만든 orderId만 사용하도록 함.
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

    const amount = pricing.finalTotal
    const taxFreeAmount = pricing.taxFreeAmount ?? 0

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + DRAFT_EXPIRY_MINUTES)

    const payload = {
      orderInput,
      itemSnapshots,
      pricing: {
        finalTotal: pricing.finalTotal,
        taxFreeAmount: pricing.taxFreeAmount ?? 0,
        appliedPoints: pricing.appliedPoints ?? 0,
        couponDiscount: pricing.couponDiscount ?? 0,
      },
    }

    const { data: draft, error } = await supabaseAdmin
      .from('order_drafts')
      .insert({
        user_id: user?.id ?? null,
        payload,
        amount,
        tax_free_amount: taxFreeAmount,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (error || !draft?.id) {
      console.error('[orders/draft] draft 생성 실패:', error)
      return NextResponse.json({ error: '주문 초안 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      orderId: draft.id,
      amount,
      taxFreeAmount,
      expiresAt: expiresAt.toISOString(),
      pricing: toPricingResponse(pricing),
    })
  } catch (error: unknown) {
    return unknownErrorResponse('orders/draft', error)
  }
}
