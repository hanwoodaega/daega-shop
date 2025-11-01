import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : (null as unknown as ReturnType<typeof createClient>)

/**
 * Database Types
 * These types represent the database schema structure
 */

export interface Product {
  id: string
  brand?: string
  name: string
  description: string
  price: number
  image_url: string
  category: string
  stock: number
  unit: string
  weight: number
  origin: string
  discount_percent?: number
  created_at: string
  updated_at: string
}

/**
 * Database CartItem type (for server-side operations)
 * Note: Client-side cart uses a different CartItem interface in @/lib/store
 */
export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  product?: Product
}

/**
 * Order type for database operations
 */
export interface Order {
  id: string
  user_id: string
  total_amount: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  delivery_type: 'pickup' | 'quick' | 'regular'
  delivery_time?: string | null
  shipping_address: string
  shipping_name: string
  shipping_phone: string
  delivery_note?: string | null
  refund_status?: 'pending' | 'processing' | 'completed' | null
  refund_amount?: number | null
  refund_requested_at?: string | null
  refund_completed_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * OrderItem type for database operations
 */
export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  created_at: string
  product?: Product
}

/**
 * Address type for database operations
 */
export interface Address {
  id: string
  user_id: string
  name: string
  recipient_name: string
  recipient_phone: string
  zipcode?: string
  address: string
  address_detail?: string
  delivery_note?: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

