import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// GET: 사용자 주문 목록 조회 (구매확정 여부 포함)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 주문 목록 조회
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price,
          product:products (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('주문 조회 실패:', ordersError)
      return NextResponse.json({ error: '주문 조회 실패' }, { status: 500 })
    }

    // 구매확정 여부 확인 (point_history에서 purchase 타입 조회)
    const orderIds = (orders || []).map((order: any) => order.id)
    let confirmedOrderIds = new Set<string>()
    
    if (orderIds.length > 0) {
      const { data: pointHistories, error: pointError } = await supabase
        .from('point_history')
        .select('order_id')
        .eq('user_id', user.id)
        .in('order_id', orderIds)
        .eq('type', 'purchase')

      if (!pointError && pointHistories) {
        confirmedOrderIds = new Set(pointHistories.map((ph: any) => ph.order_id))
      }
    }

    // 구매확정 여부 추가
    const ordersWithConfirmation = (orders || []).map((order: any) => ({
      ...order,
      is_confirmed: confirmedOrderIds.has(order.id)
    }))

    return NextResponse.json({ orders: ordersWithConfirmation })
  } catch (error: any) {
    console.error('주문 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}
