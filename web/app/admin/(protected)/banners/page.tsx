import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import BannersClient from './_components/BannersClient'
import type { Banner, Product } from './_types'

export type { Banner, Product }

// 서버에서 배너 목록 조회
async function getBanners(): Promise<Banner[]> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('배너 조회 실패:', error)
      return []
    }

    return data || []
    } catch (error) {
    console.error('배너 조회 실패:', error)
    return []
  }
}

// 서버에서 상품 목록 조회 (최대 1000개)
async function getProducts(): Promise<Product[]> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, brand, category')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('상품 조회 실패:', error)
      return []
    }

    return data || []
    } catch (error) {
    console.error('상품 조회 실패:', error)
    return []
  }
}

export default async function BannersPage() {
  // 초기 데이터 가져오기 (병렬 처리)
  const [banners, products] = await Promise.all([
    getBanners(),
    getProducts(),
  ])

  return (
    <BannersClient
      initialBanners={banners}
      initialProducts={products}
    />
  )
}
