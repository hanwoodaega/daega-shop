import { Product } from '@/lib/supabase'

export const GIFT_TARGETS = ['아이', '부모님', '연인', '친구'] as const
export type GiftTarget = typeof GIFT_TARGETS[number]

export const BUDGET_CATEGORIES = [
  { value: 'under-50k', label: '5만원 미만' },
  { value: 'over-50k', label: '5만원 이상' },
  { value: 'over-100k', label: '10만원 이상' },
  { value: 'over-200k', label: '20만원 이상' },
] as const

export type TabType = 'target' | 'budget' | 'featured'

export type { Product }

