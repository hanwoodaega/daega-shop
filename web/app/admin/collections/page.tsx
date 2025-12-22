import { assertAdmin } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { redirect } from 'next/navigation'
import CollectionsClient from './_components/CollectionsClient'
import type { Collection, Product } from './_types'

export type { Collection, Product }

// 서버에서 컬렉션 목록 조회
async function getCollections(): Promise<Collection[]> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('type', { ascending: true })

    if (error) {
      console.error('컬렉션 조회 실패:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('컬렉션 조회 실패:', error)
    return []
  }
}

// 서버에서 상품 목록 조회 (최대 1000개)
async function getProducts(): Promise<Product[]> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, brand, category, image_url')
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

// 서버에서 프로모션 적용 상품 ID 목록 조회 (N+1 문제 해결)
// Set은 직렬화가 안 되므로 배열로 반환 (클라이언트에서 Set으로 변환)
async function getPromotedProductIds(): Promise<string[]> {
  try {
    const supabase = createSupabaseAdminClient()
    
    // 활성 프로모션 조회
    const { data: promotions, error: promoError } = await supabase
      .from('promotions')
      .select('id')
      .eq('is_active', true)

    if (promoError || !promotions || promotions.length === 0) {
      return []
    }

    // 모든 활성 프로모션의 상품 ID를 한 번에 조회
    const promotionIds = promotions.map(p => p.id)
    const { data: promotionProducts, error: productsError } = await supabase
      .from('promotion_products')
      .select('product_id')
      .in('promotion_id', promotionIds)

    if (productsError) {
      console.error('프로모션 상품 조회 실패:', productsError)
      return []
    }

    // 중복 제거하여 배열로 반환 (클라이언트에서 Set으로 변환)
    const productIds = (promotionProducts || []).map((pp: any) => pp.product_id)
    return Array.from(new Set(productIds))
  } catch (error) {
    console.error('프로모션 상품 조회 실패:', error)
    return []
  }
}

export default async function CollectionsPage() {
  // 서버 사이드 인증 체크
  try {
    assertAdmin()
    } catch (error) {
    redirect('/admin/login?next=/admin/collections')
  }

  // 초기 데이터 가져오기 (병렬 처리)
  const [collections, products, promotedProductIds] = await Promise.all([
    getCollections(),
    getProducts(),
    getPromotedProductIds(),
  ])

  return (
    <CollectionsClient
      initialCollections={collections}
      initialProducts={products}
      initialPromotedProductIds={promotedProductIds}
    />
  )
}
