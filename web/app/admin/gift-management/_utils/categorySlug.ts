import { GiftTarget, BUDGET_CATEGORIES } from '../_types'

export const TARGET_SLUG_MAP: Record<GiftTarget, string> = {
  '아이': 'child',
  '부모님': 'parent',
  '연인': 'lover',
  '친구': 'friend',
}

export const BUDGET_SLUG_MAP: Record<string, string> = {
  '5만원 미만': 'under-50k',
  '5만원 이상': 'over-50k',
  '10만원 이상': 'over-100k',
  '20만원 이상': 'over-200k',
}

export function getTargetSlug(target: GiftTarget): string {
  return TARGET_SLUG_MAP[target] || 'child'
}

export function getBudgetSlug(budget: string): string {
  return BUDGET_SLUG_MAP[budget] || 'under-50k'
}

export function getBudgetLabel(slug: string): string {
  const category = BUDGET_CATEGORIES.find(c => c.value === slug)
  return category?.label || slug
}

export function getTargetLabel(slug: string): string {
  const entry = Object.entries(TARGET_SLUG_MAP).find(([_, s]) => s === slug)
  return entry ? entry[0] : slug
}

