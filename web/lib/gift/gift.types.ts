export type GiftTarget = '아이' | '부모님' | '연인' | '친구'

export type GiftBudget = 'under-50k' | 'over-50k' | 'over-100k' | 'over-200k'

export interface GiftTargetSlugMap {
  [key: string]: string
}

export interface GiftBudgetOption {
  label: string
  value: GiftBudget
}

