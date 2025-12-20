import { createSupabaseServerClient } from './supabase-server'
import { getNowUTCISO } from './time-utils'

/**
 * 활성 타임딜에서 특정 상품의 할인율 조회
 * @param productId 상품 ID
 * @returns 타임딜 할인율 (없으면 0)
 */
export async function getTimedealDiscountPercent(productId: string): Promise<number> {
  try {
    const supabase = createSupabaseServerClient()
    const now = getNowUTCISO()

    // 활성 타임딜 조회
    const { data: activeTimedeal } = await supabase
      .from('timedeals')
      .select('id')
      .lte('start_at', now)
      .gte('end_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!activeTimedeal) {
      return 0
    }

    // 해당 상품의 타임딜 할인율 조회
    const { data: timedealProduct } = await supabase
      .from('timedeal_products')
      .select('discount_percent')
      .eq('timedeal_id', activeTimedeal.id)
      .eq('product_id', productId)
      .maybeSingle()

    return timedealProduct?.discount_percent || 0
  } catch (error) {
    console.error('타임딜 할인율 조회 실패:', error)
    return 0
  }
}

/**
 * 여러 상품의 타임딜 할인율을 한 번에 조회
 * @param productIds 상품 ID 배열
 * @returns 상품 ID를 키로 하는 할인율 맵
 */
export async function getTimedealDiscountPercentMap(productIds: string[]): Promise<Map<string, number>> {
  const discountMap = new Map<string, number>()
  
  if (productIds.length === 0) {
    return discountMap
  }

  try {
    const supabase = createSupabaseServerClient()
    const now = getNowUTCISO()

    // 활성 타임딜 조회
    const { data: activeTimedeal } = await supabase
      .from('timedeals')
      .select('id')
      .lte('start_at', now)
      .gte('end_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!activeTimedeal) {
      return discountMap
    }

    // 해당 상품들의 타임딜 할인율 조회
    const { data: timedealProducts } = await supabase
      .from('timedeal_products')
      .select('product_id, discount_percent')
      .eq('timedeal_id', activeTimedeal.id)
      .in('product_id', productIds)

    if (timedealProducts) {
      timedealProducts.forEach((tp: any) => {
        discountMap.set(tp.product_id, tp.discount_percent || 0)
      })
    }

    return discountMap
  } catch (error) {
    console.error('타임딜 할인율 일괄 조회 실패:', error)
    return discountMap
  }
}

