import { Order } from '@/lib/supabase/supabase'

export interface OrderWithItems extends Order {
  order_items?: Array<{
    id: string
    product_id: string
    quantity: number
    price: number
    product?: {
      name: string
      image_url: string | null
    }
  }>
  is_confirmed?: boolean  // 구매확정 여부
  gift_card_design?: string | null
  tracking_number?: string | null
  tracking_company?: string | null
  refund_completed_at?: string | null
}

