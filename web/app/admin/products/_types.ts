export interface Product {
  id: string
  brand: string | null
  name: string
  slug: string | null
  price: number
  category: string
  weight_gram: number | null
  status: 'active' | 'soldout' | 'deleted'
  created_at?: string
  updated_at?: string
}

export interface ProductFormData {
  brand: string
  name: string
  slug: string
  price: string
  category: string
  weight_gram: string
}

export interface ProductListState {
  items: Product[]
  filterCategory: string
  search: string
  filterStatus: 'active' | 'soldout' | 'deleted' | 'all'
  page: number
  total: number
}

export interface ProductUIState {
  error: string | null
  loading: boolean
  loadingList: boolean
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  priority: number
  created_at: string
}

