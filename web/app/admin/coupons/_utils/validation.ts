import { toNumberOrNull } from './convert'
import { CouponFormData } from '../_types'

export interface ValidatedCouponData {
  name: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase_amount: number | null
  max_discount_amount: number | null
  validity_days: number
  issue_trigger: 'PHONE_VERIFIED' | 'ADMIN' | 'ETC'
}

/**
 * 쿠폰 폼 데이터 검증 및 변환
 */
export function validateCouponForm(formData: CouponFormData): {
  isValid: boolean
  error?: string
  data?: ValidatedCouponData
} {
  // 필수 필드 validation
  if (!formData.name || formData.name.trim() === '') {
    return { isValid: false, error: '쿠폰명을 입력해주세요.' }
  }

  // 숫자 필드 변환 및 validation
  const discountValue = toNumberOrNull(formData.discount_value)
  if (discountValue === null || discountValue <= 0) {
    return { isValid: false, error: '할인 금액/율을 올바르게 입력해주세요.' }
  }

  const validityDays = toNumberOrNull(formData.validity_days)
  if (validityDays === null || validityDays < 1 || validityDays > 365) {
    return { isValid: false, error: '유효 기간을 1일 이상 365일 이하로 입력해주세요.' }
  }

  // max_discount_amount validation (percentage 타입일 때 필수)
  let maxDiscountAmount: number | null = null
  if (formData.discount_type === 'percentage') {
    maxDiscountAmount = toNumberOrNull(formData.max_discount_amount)
    if (maxDiscountAmount === null || maxDiscountAmount <= 0) {
      return { isValid: false, error: '할인율 쿠폰은 최대 할인 금액을 입력해야 합니다.' }
    }
  }

  // min_purchase_amount 처리 (선택 필드)
  const minPurchaseAmount = toNumberOrNull(formData.min_purchase_amount)
  const finalMinPurchaseAmount = minPurchaseAmount !== null && minPurchaseAmount > 0 ? minPurchaseAmount : null

  // fixed 타입일 때: 할인 금액이 최소 구매 금액보다 크면 안 됨
  if (formData.discount_type === 'fixed' && finalMinPurchaseAmount !== null) {
    if (discountValue > finalMinPurchaseAmount) {
      return {
        isValid: false,
        error: '정액 할인 쿠폰의 할인 금액은 최소 구매 금액보다 작거나 같아야 합니다.',
      }
    }
  }

  return {
    isValid: true,
    data: {
      name: formData.name,
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: discountValue,
      min_purchase_amount: finalMinPurchaseAmount,
      max_discount_amount: maxDiscountAmount,
      validity_days: validityDays,
      issue_trigger: formData.issue_trigger,
    },
  }
}

