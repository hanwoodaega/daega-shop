import { z } from 'zod'
import type { OrderInput } from '@/lib/order/order-pricing.server'

const deliveryTypeSchema = z.enum(['pickup', 'quick', 'regular'])

/** 체크아웃·주문 API에서 쓰는 주문 라인 */
export const orderLineItemBodySchema = z.object({
  productId: z.string().min(1, { message: '상품 ID가 필요합니다.' }),
  quantity: z.coerce.number().int().positive({ message: '상품 수량이 올바르지 않습니다.' }),
  promotion_group_id: z.union([z.string(), z.null()]).optional(),
})

/**
 * `calculateOrderPricing` / draft / 결제 confirm(레거시 orderInput)과 동일한 형태.
 * 선택 필드는 클라이언트에서 생략될 수 있음.
 */
export const orderInputSchema = z.object({
  items: z.array(orderLineItemBodySchema).min(1, { message: '주문 상품이 없습니다.' }),
  delivery_type: deliveryTypeSchema,
  delivery_time: z.union([z.string(), z.null()]).optional(),
  shipping_address: z.string(),
  shipping_name: z.string(),
  shipping_phone: z.string(),
  delivery_note: z.union([z.string(), z.null()]).optional(),
  used_coupon_id: z.union([z.string().uuid(), z.null()]).optional(),
  used_points: z.coerce.number().int().min(0).optional(),
  is_gift: z.boolean().optional(),
  gift_message: z.union([z.string(), z.null()]).optional(),
  gift_recipient_phone: z.string().optional(),
  gift_recipient_name: z.string().optional(),
  orderer_phone: z.string().optional(),
  gift_sender_name: z.string().optional(),
  payment_method: z.union([z.string(), z.null()]).optional(),
})

/** POST /api/orders — 본문이 평탄한 필드 + items */
export const orderCreateBodySchema = z.object({
  delivery_type: deliveryTypeSchema.optional(),
  delivery_time: z.union([z.string(), z.null()]).optional(),
  shipping_address: z.string().optional(),
  shipping_name: z.string().optional(),
  shipping_phone: z.string().optional(),
  delivery_note: z.union([z.string(), z.null()]).optional(),
  used_coupon_id: z.union([z.string().uuid(), z.null()]).optional(),
  used_points: z.coerce.number().optional(),
  is_gift: z.boolean().optional(),
  gift_message: z.union([z.string(), z.null()]).optional(),
  items: z.array(orderLineItemBodySchema).min(1, { message: '주문 상품이 없습니다.' }),
})

/** POST /api/orders/draft */
export const draftPostBodySchema = z.object({
  orderInput: orderInputSchema,
})

/** POST /api/orders/confirm, /api/orders/cancel */
export const orderIdBodySchema = z.object({
  orderId: z.string().uuid({ message: '주문 ID가 필요합니다.' }),
})

/**
 * POST /api/payments/toss/confirm
 * - draft: `orderId`(초안 UUID) + `paymentKey`(mock 제외)
 * - 레거시: `orderInput`만(초안 미사용) — `orderId` 없을 수 있음
 * mock이면 paymentKey 없음 가능.
 */
export const tossConfirmBodySchema = z
  .object({
    paymentKey: z.string().optional(),
    orderId: z.string().optional(),
    orderInput: orderInputSchema.optional(),
    mock: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.mock && (!data.paymentKey || !String(data.paymentKey).trim())) {
      ctx.addIssue({
        code: 'custom',
        message: '필수 값이 누락되었습니다.',
        path: ['paymentKey'],
      })
    }
    const hasDraftId = !!(data.orderId && String(data.orderId).trim())
    const hasLegacyInput = !!(data.orderInput && data.orderInput.items.length > 0)
    if (!hasDraftId && !hasLegacyInput) {
      ctx.addIssue({
        code: 'custom',
        message: '필수 값이 누락되었습니다.',
        path: ['orderId'],
      })
    }
  })

/** POST /api/payments/toss/process-draft */
export const processDraftBodySchema = z
  .object({
    orderId: z.string().optional(),
    draftId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const id = data.orderId?.trim() || data.draftId?.trim()
    if (!id) {
      ctx.addIssue({
        code: 'custom',
        message: 'orderId(draftId) 필요',
        path: ['orderId'],
      })
    }
  })

/** POST /api/payments/toss/mock-confirm */
export const mockConfirmBodySchema = z.object({
  orderId: z.string().min(1, { message: '주문 정보가 필요합니다.' }),
  orderInput: orderInputSchema,
})

/** POST /api/payments/toss/sandbox/confirm (로컬 전용) */
export const tossSandboxConfirmBodySchema = z.object({
  paymentKey: z.string().min(1, { message: 'paymentKey가 필요합니다.' }),
  orderId: z.string().min(1, { message: 'orderId가 필요합니다.' }),
  amount: z.coerce.number().positive({ message: '금액이 필요합니다.' }),
})

export type ParsedOrderInput = z.infer<typeof orderInputSchema>

/** Zod 결과를 `OrderInput`으로 맞춤 (기본값·빈 문자열 정리). */
export function normalizeToOrderInput(raw: ParsedOrderInput): OrderInput {
  return {
    items: raw.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      promotion_group_id:
        i.promotion_group_id != null && String(i.promotion_group_id).trim() !== ''
          ? String(i.promotion_group_id).trim()
          : null,
    })),
    delivery_type: raw.delivery_type,
    delivery_time: raw.delivery_time ?? null,
    shipping_address: raw.shipping_address,
    shipping_name: raw.shipping_name,
    shipping_phone: raw.shipping_phone,
    delivery_note: raw.delivery_note ?? null,
    used_coupon_id: raw.used_coupon_id ?? null,
    used_points: raw.used_points ?? 0,
    is_gift: raw.is_gift ?? false,
    gift_message: raw.gift_message ?? null,
    gift_recipient_phone: raw.gift_recipient_phone,
    gift_recipient_name: raw.gift_recipient_name,
    orderer_phone: raw.orderer_phone,
    gift_sender_name: raw.gift_sender_name,
    payment_method: raw.payment_method ?? null,
  }
}
