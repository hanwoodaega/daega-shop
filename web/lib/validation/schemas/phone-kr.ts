import { z } from 'zod'
import { phoneDigitsOnly, normalizePhoneForOrderMatch, isValidKrMobileDigitLength } from '@/lib/phone/kr'

/** 주문조회·OTP 라우트 호환용 별칭 (`normalizePhoneForOrderMatch`와 동일) */
export const normalizePhoneForOrderLookup = normalizePhoneForOrderMatch
export const normalizePhoneLookupCompare = normalizePhoneForOrderMatch

export { phoneDigitsOnly } from '@/lib/phone/kr'

/** OTP 저장·비교: 숫자만 10~11자리 */
export const otpFlowPhoneSchema = z
  .string({ message: '휴대폰 번호를 입력해주세요.' })
  .min(1)
  .transform((s) => phoneDigitsOnly(s))
  .refine((d) => isValidKrMobileDigitLength(d), {
    message: '올바른 휴대폰 번호를 입력해주세요.',
  })

/**
 * 쿼리스트링 `order_number`·`phone` (GET /api/orders/lookup)
 */
export const orderLookupGetQuerySchema = z.object({
  order_number: z.string().min(1, { message: '주문번호를 입력해주세요.' }).transform((s) => s.trim()),
  phone: z
    .string()
    .min(1, { message: '연락처를 입력해주세요.' })
    .transform(normalizePhoneForOrderMatch)
    .refine((d) => d.length >= 10, {
      message: '연락처를 올바르게 입력해주세요.',
    }),
})
