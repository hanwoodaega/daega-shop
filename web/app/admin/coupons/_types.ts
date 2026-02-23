import { Coupon } from '@/lib/supabase/supabase'

export interface CouponFormData {
  name: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number | string
  min_purchase_amount: number | string
  max_discount_amount: number | string
  validity_days: number | string
  issue_trigger: 'PHONE_VERIFIED' | 'ADMIN' | 'ETC'
}

export interface IssueConditions {
  birthday_month: string
  min_purchase_amount: string
  purchase_period_start: string
  purchase_period_end: string
  min_purchase_count: string
  phone: string
}

export type { Coupon }

