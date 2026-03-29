import { z } from 'zod'

export const discountTypeSchema = z.enum(['percentage', 'fixed'])
export const issueTriggerSchema = z.enum(['PHONE_VERIFIED', 'ADMIN', 'ETC'])

/** POST /api/admin/coupons */
export const adminCouponCreateSchema = z
  .object({
    name: z.string().trim().min(1, { message: '쿠폰 이름이 필요합니다.' }),
    description: z.string().optional(),
    discount_type: discountTypeSchema,
    discount_value: z.coerce.number().positive({ message: '할인 금액/율은 0보다 커야 합니다.' }),
    min_purchase_amount: z.coerce.number().optional(),
    max_discount_amount: z.coerce.number().optional().nullable(),
    validity_days: z.coerce
      .number()
      .int()
      .min(1, { message: '유효 기간은 1일 이상 365일 이하여야 합니다.' })
      .max(365, { message: '유효 기간은 1일 이상 365일 이하여야 합니다.' }),
    is_active: z.boolean().optional(),
    issue_trigger: issueTriggerSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === 'percentage') {
      const max = data.max_discount_amount
      if (max == null || max <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: '할인율 쿠폰은 최대 할인 금액을 입력해야 합니다.',
          path: ['max_discount_amount'],
        })
      }
    }
  })

/** PUT /api/admin/coupons/[id] */
export const adminCouponUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.union([z.string(), z.null()]).optional(),
    discount_type: discountTypeSchema.optional(),
    discount_value: z.coerce.number().positive({ message: '할인 금액/율은 0보다 커야 합니다.' }).optional(),
    min_purchase_amount: z.coerce.number().optional(),
    max_discount_amount: z.coerce.number().optional().nullable(),
    validity_days: z.coerce
      .number()
      .int()
      .min(1, { message: '유효 기간은 1일 이상 365일 이하여야 합니다.' })
      .max(365, { message: '유효 기간은 1일 이상 365일 이하여야 합니다.' })
      .optional(),
    is_active: z.boolean().optional(),
    issue_trigger: issueTriggerSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === 'percentage') {
      const max = data.max_discount_amount
      if (max == null || max <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: '할인율 쿠폰은 최대 할인 금액을 입력해야 합니다.',
          path: ['max_discount_amount'],
        })
      }
    }
  })

/** POST /api/admin/coupons/issue (일괄 지급) */
export const adminCouponBulkIssueSchema = z.object({
  coupon_id: z.string().uuid({ message: '쿠폰 ID가 필요합니다.' }),
  conditions: z
    .object({
      phone: z.string().optional(),
    })
    .optional(),
})

/** POST /api/coupons/issue (단건 지급, 관리자) */
export const couponIssuePairSchema = z.object({
  couponId: z.string().uuid({ message: '쿠폰 ID가 필요합니다.' }),
  userId: z.string().uuid({ message: '사용자 ID가 필요합니다.' }),
})
