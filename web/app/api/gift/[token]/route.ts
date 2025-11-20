import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * 선물 토큰으로 주문 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { token } = params

    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
    }

    // gift_token 컬럼 또는 gift_info JSON에서 토큰으로 주문 조회
    // 먼저 gift_token 컬럼으로 조회 시도
    let { data: orders, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        total_amount,
        status,
        is_gift,
        gift_token,
        gift_info,
        gift_message,
        gift_card_design,
        gift_expires_at,
        shipping_address,
        shipping_name,
        shipping_phone,
        created_at,
        status,
        user_id,
        total_amount,
        order_items (
          id,
          quantity,
          price,
          products (
            id,
            name,
            image_url
          )
        )
      `)
      .eq('is_gift', true)
      .eq('gift_token', token)
      .maybeSingle()

    // gift_token 컬럼이 없거나 조회 실패한 경우 gift_info JSON에서 찾기
    if ((orderError && (orderError.code === '42703' || orderError.message?.includes('column'))) || !orders) {
      // 모든 선물 주문을 가져와서 gift_info에서 토큰 찾기
      const { data: allGiftOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          total_amount,
          status,
          is_gift,
        gift_token,
        gift_info,
        gift_message,
        gift_card_design,
        gift_expires_at,
        shipping_address,
        shipping_name,
        shipping_phone,
        created_at,
        status,
        user_id,
        total_amount,
        order_items (
            id,
            quantity,
            price,
            products (
              id,
              name,
              image_url
            )
          )
        `)
        .eq('is_gift', true)

      if (allOrdersError) {
        console.error('주문 조회 실패:', allOrdersError)
        return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
      }

      // gift_info JSON에서 토큰 찾기
      orders = allGiftOrders?.find((order: any) => {
        if (order.gift_token === token) return true
        if (order.gift_info) {
          try {
            const giftInfo = typeof order.gift_info === 'string' 
              ? JSON.parse(order.gift_info) 
              : order.gift_info
            return giftInfo.token === token
          } catch (e) {
            return false
          }
        }
        return false
      }) || null
    } else if (orderError) {
      console.error('주문 조회 실패:', orderError)
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!orders) {
      return NextResponse.json({ error: '유효하지 않은 선물 링크입니다.' }, { status: 404 })
    }

    // 이미 주소가 입력된 경우 (선물 수령 완료)
    if (orders.shipping_address && orders.shipping_address !== '선물 수령 대기') {
      return NextResponse.json({ 
        error: '이미 수령된 선물입니다.',
        order: orders 
      }, { status: 400 })
    }

    // 만료일 체크
    let expiresAt: Date | null = null
    if (orders.gift_expires_at) {
      expiresAt = new Date(orders.gift_expires_at)
    } else if (orders.gift_info) {
      try {
        const giftInfo = typeof orders.gift_info === 'string' 
          ? JSON.parse(orders.gift_info) 
          : orders.gift_info
        if (giftInfo.expires_at) {
          expiresAt = new Date(giftInfo.expires_at)
        }
      } catch (e) {
        console.error('gift_info 파싱 실패:', e)
      }
    }

    // 만료일이 있고 만료된 경우
    if (expiresAt && expiresAt < new Date()) {
      // 만료된 주문은 자동으로 환불 처리
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      
      // 주문 상태를 취소로 변경
      await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'cancelled',
          shipping_address: '만료로 인한 자동 취소'
        })
        .eq('id', orders.id)

      // 환불 처리 (포인트 사용한 경우 포인트 복구, 쿠폰 복구 등)
      // TODO: 실제 환불 로직 구현 (결제 시스템 연동 필요)

      return NextResponse.json({ 
        error: '선물 링크가 만료되었습니다. (7일 경과)',
        expired: true,
        expires_at: expiresAt.toISOString()
      }, { status: 410 }) // 410 Gone: 리소스가 영구적으로 사라짐
    }

    return NextResponse.json({ 
      order: orders,
      expires_at: expiresAt?.toISOString() || null
    })
  } catch (error: any) {
    console.error('선물 조회 실패:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

/**
 * 선물 수령 시 주문 정보 업데이트 (이름, 주소 입력)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { token } = params
    const body = await request.json()

    const {
      recipient_name,
      recipient_phone,
      zipcode,
      address,
      address_detail,
      delivery_note
    } = body

    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
    }

    if (!recipient_name || !recipient_phone || !address) {
      return NextResponse.json({ error: '필수 정보를 모두 입력해주세요.' }, { status: 400 })
    }

    // 토큰으로 주문 조회
    let { data: order, error: findError } = await supabase
      .from('orders')
      .select('id, shipping_address, status, gift_token, gift_info, gift_expires_at, user_id, total_amount, created_at')
      .eq('is_gift', true)
      .eq('gift_token', token)
      .maybeSingle()

    // gift_token 컬럼이 없거나 조회 실패한 경우 gift_info JSON에서 찾기
    if ((findError && (findError.code === '42703' || findError.message?.includes('column'))) || !order) {
      const { data: allGiftOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, shipping_address, status, gift_token, gift_info, gift_expires_at, user_id, total_amount, created_at')
        .eq('is_gift', true)

      if (allOrdersError) {
        return NextResponse.json({ error: '유효하지 않은 선물 링크입니다.' }, { status: 404 })
      }

      order = allGiftOrders?.find((o: any) => {
        if (o.gift_token === token) return true
        if (o.gift_info) {
          try {
            const giftInfo = typeof o.gift_info === 'string' ? JSON.parse(o.gift_info) : o.gift_info
            return giftInfo.token === token
          } catch (e) {
            return false
          }
        }
        return false
      }) || null

      if (!order) {
        findError = { message: '주문을 찾을 수 없습니다.' } as any
      }
    } else if (findError) {
      return NextResponse.json({ error: '유효하지 않은 선물 링크입니다.' }, { status: 404 })
    }

    if (findError || !order) {
      return NextResponse.json({ error: '유효하지 않은 선물 링크입니다.' }, { status: 404 })
    }

    // 이미 주소가 입력된 경우
    if (order.shipping_address && order.shipping_address !== '선물 수령 대기') {
      return NextResponse.json({ error: '이미 수령된 선물입니다.' }, { status: 400 })
    }

    // 만료일 체크
    let expiresAt: Date | null = null
    if (order.gift_expires_at) {
      expiresAt = new Date(order.gift_expires_at)
    } else if (order.gift_info) {
      try {
        const giftInfo = typeof order.gift_info === 'string' 
          ? JSON.parse(order.gift_info) 
          : order.gift_info
        if (giftInfo.expires_at) {
          expiresAt = new Date(giftInfo.expires_at)
        }
      } catch (e) {
        console.error('gift_info 파싱 실패:', e)
      }
    }

    // 만료일이 있고 만료된 경우
    if (expiresAt && expiresAt < new Date()) {
      // 만료된 주문은 자동으로 환불 처리
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      
      // 주문 상태를 취소로 변경
      await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'cancelled',
          shipping_address: '만료로 인한 자동 취소'
        })
        .eq('id', order.id)

      // 환불 처리 (포인트 사용한 경우 포인트 복구, 쿠폰 복구 등)
      // TODO: 실제 환불 로직 구현 (결제 시스템 연동 필요)

      return NextResponse.json({ 
        error: '선물 링크가 만료되었습니다. (7일 경과)',
        expired: true,
        expires_at: expiresAt.toISOString()
      }, { status: 410 })
    }

    // 주문 정보 업데이트
    const shippingAddress = `${address}${address_detail ? ' ' + address_detail : ''}`
    
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        shipping_name: recipient_name,
        shipping_phone: recipient_phone,
        shipping_address: shippingAddress,
        delivery_note: delivery_note || null,
        status: 'paid' // 주소 입력 후 결제 완료 상태로 변경
      })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      console.error('주문 업데이트 실패:', updateError)
      return NextResponse.json({ error: '주문 정보 업데이트에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '선물 수령 정보가 등록되었습니다.',
      order: updatedOrder 
    })
  } catch (error: any) {
    console.error('선물 수령 처리 실패:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

