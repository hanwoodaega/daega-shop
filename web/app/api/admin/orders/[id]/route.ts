import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { cookies } from 'next/headers'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  return adminAuth?.value === '1'
}

const ORDER_SELECT = `
  *,
  order_items (
    id,
    product_id,
    quantity,
    price,
    product:products (
      id,
      name,
      price,
      promotion_products (
        promotion_id,
        promotions (
          id,
          type,
          buy_qty,
          discount_percent,
          is_active
        )
      )
    )
  )
`

/** GET: 단일 주문 상세 (목록과 동일한 구조로 반환) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { id } = await params
    const supabase = createSupabaseAdminClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    const userIds = [order.user_id]
    const userMap: Record<string, any> = {}
    const { data: users } = await supabase
      .from('users')
      .select('id, name, phone')
      .in('id', userIds)
    if (users) {
      users.forEach((u: any) => { userMap[u.id] = u })
    }

    let productOriginalTotal = 0
    let productOrderedTotal = 0
    if (order.order_items?.length) {
      order.order_items.forEach((item: any) => {
        productOriginalTotal += (item.product?.price || 0) * item.quantity
        productOrderedTotal += (item.price || 0) * item.quantity
      })
    }

    const { data: pointUsageList } = await supabase
      .from('point_history')
      .select('points, created_at')
      .eq('order_id', order.id)
      .eq('type', 'usage')
      .order('created_at', { ascending: true })
      .limit(1)
    const firstPoint = pointUsageList?.[0]?.points
    const usedPoints = firstPoint != null && firstPoint < 0 ? Math.abs(firstPoint) : 0

    const { data: userCoupon } = await supabase
      .from('user_coupons')
      .select('*, coupon:coupons (*)')
      .eq('order_id', order.id)
      .eq('is_used', true)
      .maybeSingle()
    let couponDiscount = 0
    if (userCoupon?.coupon) {
      const c = userCoupon.coupon as any
      const afterImmediate = productOriginalTotal > 0 ? productOriginalTotal : productOrderedTotal
      if (c.discount_type === 'percentage') {
        couponDiscount = Math.floor(afterImmediate * (c.discount_value / 100))
        if (c.max_discount_amount) couponDiscount = Math.min(couponDiscount, c.max_discount_amount)
      } else {
        couponDiscount = c.discount_value
      }
    }

    let shipping = 0
    if (order.delivery_type === 'pickup') shipping = 0
    else if (order.delivery_type === 'quick') shipping = 5000
    else {
      const afterDiscounts = (productOriginalTotal > 0 ? productOriginalTotal : productOrderedTotal) - couponDiscount - usedPoints
      shipping = afterDiscounts >= 50000 ? 0 : 3000
    }

    let immediateDiscount = Math.max(0, productOriginalTotal - productOrderedTotal)
    if (immediateDiscount === 0) {
      const estimated = productOriginalTotal - couponDiscount - usedPoints + shipping - order.total_amount
      if (estimated > 0) immediateDiscount = estimated
    }

    const enriched = {
      ...order,
      immediateDiscount,
      couponDiscount,
      usedPoints,
      shipping,
      productOriginalTotal,
      productOrderedTotal,
      user: userMap[order.user_id] || null,
    }

    return NextResponse.json(enriched)
  } catch (e) {
    console.error('주문 상세 조회 에러:', e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
