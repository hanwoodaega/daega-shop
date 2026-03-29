export const INITIAL_FORM_DATA = {
  title: '',
  type: 'bogo' as const,
  buy_qty: 1,
  discount_percent: 0,
  is_active: true,
  group_id: '',
}

export const BOGO_OPTIONS = [
  { value: 1, label: '1+1 (2개 중 1개 무료)' },
  { value: 2, label: '2+1 (3개 중 1개 무료)' },
  { value: 3, label: '3+1 (4개 중 1개 무료)' },
]

