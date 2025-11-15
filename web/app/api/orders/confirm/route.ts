import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { addPoints } from '@/lib/points'

/**
 * 구매확정 API
 * POST /api/orders/confirm
 * 
 * 배송완료된 주문을 구매확정하고 포인트를 적립합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: '주문 ID가 필요합니다.' }, { status: 400 })
    }

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 배송완료 상태인지 확인
    if (order.status !== 'delivered') {
      return NextResponse.json({ 
        error: '배송완료된 주문만 구매확정할 수 있습니다.' 
      }, { status: 400 })
    }

    // 이미 구매확정되었는지 확인 (point_history에서 확인)
    const { data: existingPoints } = await supabase
      .from('point_history')
      .select('id')
      .eq('order_id', orderId)
      .eq('type', 'purchase')
      .single()

    if (existingPoints) {
      return NextResponse.json({ 
        error: '이미 구매확정된 주문입니다.' 
      }, { status: 400 })
    }

    // 쿠폰 할인 금액 계산 (주문 정보에서 추출)
    // 주문 생성 시 finalAmount = total_amount - couponDiscount - usedPoints
    // 포인트 적립은 최종 결제 금액 기준이므로, 주문 정보에서 계산
    // 실제로는 주문 생성 시 저장된 final_amount를 사용해야 하지만,
    // 현재 orders 테이블에 final_amount가 없으므로 total_amount 기준으로 계산
    // (쿠폰 할인과 포인트 사용은 이미 반영된 상태)
    
    // 주문 생성 시 사용한 포인트 확인
    const { data: pointUsage } = await supabase
      .from('point_history')
      .select('points')
      .eq('order_id', orderId)
      .eq('type', 'usage')
      .single()

    const usedPoints = pointUsage ? Math.abs(pointUsage.points) : 0
    
    // 최종 결제 금액 계산 (주문 생성 시와 동일한 로직)
    // total_amount는 쿠폰 할인 전 금액이므로, 실제 결제 금액을 추정
    // 정확한 계산을 위해서는 orders 테이블에 final_amount를 저장하는 것이 좋지만,
    // 현재는 total_amount 기준으로 계산 (쿠폰 할인은 이미 반영되었다고 가정)
    const finalAmount = order.total_amount - usedPoints

    // 포인트 적립 (최종 결제 금액의 1%)
    const pointsToAdd = Math.floor(Math.max(0, finalAmount) * 0.01)
    
    if (pointsToAdd > 0) {
      const success = await addPoints(
        user.id,
        pointsToAdd,
        'purchase',
        `주문 #${order.id} 구매확정 적립`,
        order.id
      )

      if (!success) {
        return NextResponse.json({ 
          error: '포인트 적립에 실패했습니다.' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: '구매확정이 완료되었습니다.',
      pointsEarned: pointsToAdd
    })
  } catch (error: any) {
    console.error('구매확정 실패:', error)
    return NextResponse.json({ 
      error: error.message || '서버 오류' 
    }, { status: 500 })
  }
}

