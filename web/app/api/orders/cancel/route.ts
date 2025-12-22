import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { handleOrderCancellationPoints } from '@/lib/point/points'

/**
 * 주문 취소 API
 * POST /api/orders/cancel
 * 
 * 주문을 취소하고 환불 처리를 시작합니다.
 * - 포인트 적립 회수 (구매확정 전이면 없을 수 있음)
 * - 사용한 포인트 환불
 * - 환불 상태를 pending으로 설정
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

    // 취소 가능한 상태인지 확인 (주문완료 상태만 취소 가능)
    if (order.status !== 'paid' && order.status !== 'ORDER_RECEIVED') {
      return NextResponse.json({ 
        error: '취소할 수 없는 주문 상태입니다. 주문완료 상태에서만 취소 가능합니다.' 
      }, { status: 400 })
    }

    // 사용한 포인트 조회
    const { data: pointUsage } = await supabase
      .from('point_history')
      .select('points')
      .eq('order_id', orderId)
      .eq('type', 'usage')
      .maybeSingle()

    const usedPoints = pointUsage ? Math.abs(pointUsage.points) : 0

    // 주문 취소 처리 (포인트 처리 포함)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        refund_status: 'pending',
        refund_amount: order.total_amount,
        refund_requested_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ 
        error: '주문 취소 처리에 실패했습니다.' 
      }, { status: 500 })
    }

    // 포인트 처리 (적립 회수 + 사용 포인트 환불)
    const pointResult = await handleOrderCancellationPoints(
      user.id,
      orderId,
      order.total_amount,
      usedPoints
    )

    return NextResponse.json({ 
      success: true,
      message: '주문이 취소되었습니다. 환불이 진행됩니다.',
      refund: {
        amount: order.total_amount,
        status: 'pending'
      },
      points: {
        deducted: pointResult.deducted,
        refunded: pointResult.refunded
      }
    })
  } catch (error: any) {
    console.error('주문 취소 실패:', error)
    return NextResponse.json({ 
      error: error.message || '서버 오류' 
    }, { status: 500 })
  }
}

