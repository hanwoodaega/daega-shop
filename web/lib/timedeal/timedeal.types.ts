import { Product } from '@/lib/supabase/supabase'

export interface TimeDealInfo {
  id: string
  title?: string | null
  description?: string | null
  end_at?: string | null
}

export interface TimeDealData {
  timedeal: TimeDealInfo
  products: Product[]
  title?: string
}

export interface TimeDealInfoForProducts {
  title: string
  description: string | null
  endTime: string | null
}


