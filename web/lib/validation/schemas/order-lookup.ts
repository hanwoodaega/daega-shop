import { z } from 'zod'
import { otpFlowPhoneSchema } from '@/lib/validation/schemas/phone-kr'

const orderNumberField = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .pipe(z.string().min(1, { message: '주문번호를 입력해주세요.' }))

/** POST /api/orders/lookup/send-otp */
export const orderLookupSendOtpBodySchema = z.object({
  order_number: orderNumberField,
  phone: otpFlowPhoneSchema,
})

/** POST /api/orders/lookup/verify */
export const orderLookupVerifyBodySchema = z.object({
  order_number: orderNumberField,
  phone: otpFlowPhoneSchema,
  code: z.string().min(1, { message: '인증번호를 입력해주세요.' }),
})

/** POST /api/orders/lookup/cancel */
export const guestOrderCancelBodySchema = z.object({
  orderId: z.string().uuid({ message: '주문 ID가 필요합니다.' }),
  token: z.string().min(1, { message: '토큰이 필요합니다.' }),
})
