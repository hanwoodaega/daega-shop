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

    console.log('GET: API 호출 시작:', { token, params })

    if (!token) {
      console.error('GET: 토큰이 없습니다')
      return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
    }

    // gift_token 컬럼 또는 gift_info JSON에서 토큰으로 주문 조회
    console.log('GET: 선물 토큰으로 주문 조회 시작:', { token })
    
    // 먼저 gift_token 컬럼으로 조회 시도 (is_gift 필터 없이)
    // gift_info 컬럼이 없을 수 있으므로 제외
    let { data: orders, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        total_amount,
        status,
        is_gift,
        gift_token,
        gift_message,
        gift_card_design,
        gift_expires_at,
        shipping_address,
        shipping_name,
        shipping_phone,
        created_at,
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
      .eq('gift_token', token)
      .maybeSingle()

    console.log('GET: gift_token 컬럼으로 조회 결과:', { 
      found: !!orders, 
      error: orderError?.message,
      errorCode: orderError?.code,
      orderId: orders?.id
    })

    // 조회 실패한 경우 모든 주문에서 토큰 찾기
    if (orderError || !orders) {
      console.log('GET: 모든 주문 조회 시작 (토큰으로 찾기)')
      // 모든 주문을 가져와서 gift_token으로 토큰 찾기
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          total_amount,
          status,
          is_gift,
          gift_token,
          gift_message,
          gift_card_design,
          gift_expires_at,
          shipping_address,
          shipping_name,
          shipping_phone,
          created_at,
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

      if (allOrdersError) {
        console.error('GET: 모든 주문 조회 실패:', allOrdersError)
        return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
      }

      console.log(`GET: 총 ${allOrders?.length || 0}개의 주문 발견`)

      // 디버깅: gift_token이 있는 주문만 확인
      const ordersWithToken = allOrders?.filter((o: any) => o.gift_token) || []
      console.log(`GET: gift_token이 있는 주문: ${ordersWithToken.length}개`)
      if (ordersWithToken.length > 0) {
        console.log('GET: gift_token 목록:', ordersWithToken.map((o: any) => ({
          id: o.id,
          is_gift: o.is_gift,
          gift_token: o.gift_token?.substring(0, 20) + '...'
        })))
      }

      // gift_token으로 토큰 찾기
      orders = allOrders?.find((order: any) => {
        if (order.gift_token === token) {
          console.log('GET: gift_token에서 토큰 발견:', order.id)
          return true
        }
        return false
      }) || null

      console.log('GET: 최종 조회 결과:', { found: !!orders, orderId: orders?.id, token })
    } else if (orderError) {
      console.error('GET: 주문 조회 실패:', orderError)
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
    console.log('POST: 선물 토큰으로 주문 조회 시작:', { token, tokenLength: token?.length })
    
    let order: any = null
    let findError: any = null

    // 먼저 gift_token 컬럼으로 조회 시도
    const { data: orderByToken, error: tokenError } = await supabase
      .from('orders')
      .select('id, shipping_address, status, gift_token, gift_expires_at, user_id, total_amount, created_at, is_gift')
      .eq('gift_token', token)
      .maybeSingle()

    console.log('POST: gift_token 컬럼으로 조회 결과:', { 
      found: !!orderByToken, 
      error: tokenError?.message,
      errorCode: tokenError?.code,
      orderId: orderByToken?.id,
      orderGiftToken: orderByToken?.gift_token?.substring(0, 20) + '...',
      orderIsGift: orderByToken?.is_gift
    })

    if (orderByToken) {
      order = orderByToken
    } else {
      // 조회 실패한 경우 모든 주문에서 토큰 찾기
      console.log('POST: 모든 주문 조회 시작 (토큰으로 찾기)')
      
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, shipping_address, status, gift_token, gift_expires_at, user_id, total_amount, created_at, is_gift')

      if (allOrdersError) {
        console.error('POST: 모든 주문 조회 실패:', allOrdersError)
        findError = allOrdersError
      } else {
        console.log(`POST: 총 ${allOrders?.length || 0}개의 주문 발견`)

        // gift_token이 있는 주문만 필터링
        const ordersWithToken = allOrders?.filter((o: any) => o.gift_token) || []
        console.log(`POST: gift_token이 있는 주문: ${ordersWithToken.length}개`)
        
        if (ordersWithToken.length > 0) {
          console.log('POST: gift_token 샘플:', ordersWithToken.slice(0, 3).map((o: any) => ({
            id: o.id,
            token: o.gift_token?.substring(0, 20) + '...',
            is_gift: o.is_gift
          })))
        }

        // gift_token으로 토큰 찾기
        order = ordersWithToken.find((o: any) => {
          if (o.gift_token === token) {
            console.log('POST: gift_token에서 토큰 발견:', { orderId: o.id, isGift: o.is_gift })
            return true
          }
          return false
        }) || null

        console.log('POST: 최종 조회 결과:', { 
          found: !!order, 
          orderId: order?.id,
          searchedToken: token?.substring(0, 20) + '...'
        })
      }
    }

    if (!order) {
      console.error('POST: 주문을 찾을 수 없음:', { 
        token: token?.substring(0, 20) + '...',
        error: findError?.message || tokenError?.message
      })
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

    // 주문 정보 업데이트 (RLS 우회를 위해 admin client 사용)
    const shippingAddress = `${address}${address_detail ? ' ' + address_detail : ''}`
    
    console.log('POST: 주문 업데이트 시작:', { 
      orderId: order.id, 
      recipient_name, 
      recipient_phone,
      shippingAddress 
    })
    
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
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
      console.error('POST: 주문 업데이트 실패:', updateError)
      return NextResponse.json({ error: '주문 정보 업데이트에 실패했습니다.' }, { status: 500 })
    }

    console.log('POST: 주문 업데이트 성공:', { orderId: updatedOrder?.id })

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

