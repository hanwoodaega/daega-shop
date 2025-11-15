import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * 주문 취소 API
 * POST /api/orders/cancel
 * 
 * 주문을 취소합니다.
 * (구매확정 전이므로 포인트 적립이 없어 환불할 필요 없음)
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

    // 취소 가능한 상태인지 확인 (결제 완료 상태만 취소 가능)
    if (order.status !== 'paid') {
      return NextResponse.json({ 
        error: '취소할 수 없는 주문 상태입니다.' 
      }, { status: 400 })
    }

    // 주문 취소 처리
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

    return NextResponse.json({ 
      success: true,
      message: '주문이 취소되었습니다.'
    })
  } catch (error: any) {
    console.error('주문 취소 실패:', error)
    return NextResponse.json({ 
      error: error.message || '서버 오류' 
    }, { status: 500 })
  }
}

