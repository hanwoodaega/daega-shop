import { Product } from '@/lib/supabase/supabase'

export type ProductSortOrder = 'default' | 'price_asc' | 'price_desc'

export type ProductFilter = 'best' | 'sale' | 'flash-sale'

export interface FetchProductsParams {
  page?: number
  limit?: number
  sort?: ProductSortOrder
  category?: string
  search?: string
  filter?: ProductFilter
}

export interface FetchProductsResponse {
  products: Product[]
  totalPages: number
}

