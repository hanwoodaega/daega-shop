import { calculateShipping } from './order-calc'
import { getFinalPricing } from '../product/product.pricing'
import { extractActivePromotion, PRODUCT_SELECT_FIELDS } from '../product/product.service'
import { GIFT_MIN_AMOUNT } from '../utils/constants'
import { SupabaseClient } from '@supabase/supabase-js'

async function getTimedealDiscountMapWithAdmin(
  supabaseAdmin: SupabaseClient,
  productIds: string[]
): Promise<Map<string, number>> {
  const discountMap = new Map<string, number>()
  if (productIds.length === 0) return discountMap

  const now = new Date().toISOString()
  const { data: activeTimedeal } = await supabaseAdmin
    .from('timedeals')
    .select('id')
    .lte('start_at', now)
    .gte('end_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!activeTimedeal) return discountMap

  const { data: timedealProducts } = await supabaseAdmin
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
}

export interface OrderItemInput {
  productId: string
  quantity: number
  promotion_group_id?: string | null
}

export interface OrderInput {
  items: OrderItemInput[]
  delivery_type: 'pickup' | 'quick' | 'regular'
  delivery_time: string | null
  shipping_address: string
  shipping_name: string
  shipping_phone: string
  delivery_note: string | null
  used_coupon_id: string | null
  used_points: number
  is_gift: boolean
  gift_message: string | null
  gift_card_design: string | null
  payment_method?: string | null
}

export interface PricingResult {
  originalTotal: number
  discountedTotal: number
  shipping: number
  couponDiscount: number
  appliedPoints: number
  finalTotal: number
}

export interface OrderItemSnapshot {
  product_id: string
  quantity: number
  price: number
  final_unit_price: number
  promotion_group_id?: string | null
}

function isCouponExpired(userCoupon: any, coupon: any): boolean {
  const now = new Date()

  if (userCoupon?.expires_at) {
    return now > new Date(userCoupon.expires_at)
  }

  if (!coupon?.validity_days || coupon.validity_days <= 0) {
    return true
  }

  const issuedAt = new Date(userCoupon.created_at)
  const validUntil = new Date(issuedAt)
  validUntil.setDate(validUntil.getDate() + coupon.validity_days)
  return now > validUntil
}

function ensurePositiveQuantity(items: OrderItemInput[]) {
  items.forEach((item) => {
    if (!item.quantity || item.quantity <= 0) {
      throw new Error('상품 수량이 올바르지 않습니다.')
    }
  })
}

export async function calculateOrderPricing({
  supabaseAdmin,
  userId,
  input,
}: {
  supabaseAdmin: SupabaseClient
  userId: string
  input: OrderInput
}): Promise<{
  pricing: PricingResult
  itemSnapshots: OrderItemSnapshot[]
}> {
  if (!input.items || input.items.length === 0) {
    throw new Error('주문 상품이 없습니다.')
  }

  ensurePositiveQuantity(input.items)

  const productIds = Array.from(new Set(input.items.map((item) => item.productId)))
  const { data: products, error: productError } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_SELECT_FIELDS)
    .in('id', productIds)

  if (productError || !products) {
    throw new Error('상품 정보를 불러오지 못했습니다.')
  }

  if (products.length !== productIds.length) {
    throw new Error('일부 상품 정보를 찾을 수 없습니다.')
  }

  const timedealMap = await getTimedealDiscountMapWithAdmin(supabaseAdmin, productIds)

  const productMap = new Map<string, any>()
  products.forEach((product: any) => {
    productMap.set(product.id, {
      ...product,
      promotion: extractActivePromotion(product),
      timedeal_discount_percent: timedealMap.get(product.id) || 0,
    })
  })

  let originalTotal = 0
  let discountedTotal = 0

  const groupedItems = new Map<string, OrderItemInput[]>()
  const standaloneItems: OrderItemInput[] = []

  input.items.forEach((item) => {
    const product = productMap.get(item.productId)
    if (!product) {
      throw new Error('상품 정보를 찾을 수 없습니다.')
    }
    if (product.status === 'soldout' || product.status === 'deleted') {
      throw new Error('판매 불가 상품이 포함되어 있습니다.')
    }

    originalTotal += product.price * item.quantity

    if (item.promotion_group_id) {
      const group = groupedItems.get(item.promotion_group_id) || []
      group.push(item)
      groupedItems.set(item.promotion_group_id, group)
    } else {
      standaloneItems.push(item)
    }
  })

  const itemSnapshots: OrderItemSnapshot[] = []

  standaloneItems.forEach((item) => {
    const product = productMap.get(item.productId)
    const pricing = getFinalPricing({
      basePrice: product.price,
      timedealDiscountPercent: product.timedeal_discount_percent,
      promotion: product.promotion,
      weightGram: product.weight_gram,
    })
    discountedTotal += pricing.finalPrice * item.quantity
    itemSnapshots.push({
      product_id: item.productId,
      quantity: item.quantity,
      price: product.price,
      final_unit_price: pricing.finalPrice,
    })
  })

  groupedItems.forEach((items, groupId) => {
    const firstProduct = productMap.get(items[0].productId)
    const promotion = firstProduct?.promotion
    const isBogo = promotion?.type === 'bogo' && promotion?.buy_qty

    if (!isBogo) {
      items.forEach((item) => {
        const product = productMap.get(item.productId)
        const pricing = getFinalPricing({
          basePrice: product.price,
          timedealDiscountPercent: product.timedeal_discount_percent,
          promotion: product.promotion,
          weightGram: product.weight_gram,
        })
        discountedTotal += pricing.finalPrice * item.quantity
        itemSnapshots.push({
          product_id: item.productId,
          quantity: item.quantity,
          price: product.price,
          final_unit_price: pricing.finalPrice,
          promotion_group_id: groupId,
        })
      })
      return
    }

    const buyQty = promotion.buy_qty || 1
    const unitEntries: Array<{ productId: string; price: number }> = []
    items.forEach((item) => {
      const product = productMap.get(item.productId)
      for (let i = 0; i < item.quantity; i += 1) {
        unitEntries.push({ productId: item.productId, price: product.price })
      }
    })

    const freeCount = Math.floor(unitEntries.length / (buyQty + 1))
    unitEntries.sort((a, b) => a.price - b.price)
    const freeUnits = unitEntries.slice(0, freeCount)

    const freeCountByProduct = new Map<string, number>()
    freeUnits.forEach((unit) => {
      freeCountByProduct.set(unit.productId, (freeCountByProduct.get(unit.productId) || 0) + 1)
    })

    items.forEach((item) => {
      const product = productMap.get(item.productId)
      const freeForProduct = freeCountByProduct.get(item.productId) || 0
      const paidQty = Math.max(0, item.quantity - freeForProduct)
      const paidTotal = paidQty * product.price
      const finalUnitPrice = item.quantity > 0
        ? Math.round(paidTotal / item.quantity)
        : product.price
      discountedTotal += paidTotal
      itemSnapshots.push({
        product_id: item.productId,
        quantity: item.quantity,
        price: product.price,
        final_unit_price: finalUnitPrice,
        promotion_group_id: groupId,
      })
    })
  })

  if (input.is_gift && discountedTotal < GIFT_MIN_AMOUNT) {
    throw new Error(`선물하기는 상품금액(할인 적용 후)이 ${GIFT_MIN_AMOUNT}원 이상이어야 합니다.`)
  }

  const shipping = calculateShipping(discountedTotal, input.delivery_type)

  let couponDiscount = 0
  if (input.used_coupon_id) {
    const { data: userCoupon } = await supabaseAdmin
      .from('user_coupons')
      .select(`*, coupon:coupons (*)`)
      .eq('id', input.used_coupon_id)
      .eq('user_id', userId)
      .eq('is_used', false)
      .maybeSingle()

    if (!userCoupon || !userCoupon.coupon) {
      throw new Error('사용 가능한 쿠폰을 찾을 수 없습니다.')
    }

    const coupon = userCoupon.coupon
    if (coupon.is_deleted) {
      throw new Error('삭제된 쿠폰입니다.')
    }
    if (!coupon.is_active) {
      throw new Error('비활성화된 쿠폰입니다.')
    }
    if (isCouponExpired(userCoupon, coupon)) {
      throw new Error('만료된 쿠폰입니다.')
    }
    if (coupon.min_purchase_amount && discountedTotal < coupon.min_purchase_amount) {
      throw new Error(`최소 구매 금액 ${coupon.min_purchase_amount}원 이상이어야 합니다.`)
    }

    if (coupon.discount_type === 'percentage') {
      couponDiscount = Math.floor(discountedTotal * (coupon.discount_value / 100))
      if (coupon.max_discount_amount) {
        couponDiscount = Math.min(couponDiscount, coupon.max_discount_amount)
      }
    } else {
      couponDiscount = coupon.discount_value
    }

    couponDiscount = Math.min(discountedTotal, Math.max(0, couponDiscount))
  }

  let appliedPoints = 0
  if (input.used_points && input.used_points > 0) {
    const { data: userPoints } = await supabaseAdmin
      .from('user_points')
      .select('total_points')
      .eq('user_id', userId)
      .maybeSingle()

    const totalPoints = userPoints?.total_points || 0
    const maxUsable = Math.max(0, discountedTotal - couponDiscount)
    appliedPoints = Math.min(input.used_points, totalPoints, maxUsable)
  }

  const finalTotal = Math.max(0, discountedTotal - couponDiscount - appliedPoints) + shipping

  return {
    pricing: {
      originalTotal,
      discountedTotal,
      shipping,
      couponDiscount,
      appliedPoints,
      finalTotal,
    },
    itemSnapshots,
  }
}
