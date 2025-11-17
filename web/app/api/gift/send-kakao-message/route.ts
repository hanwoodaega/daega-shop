import { NextRequest, NextResponse } from 'next/server'

/**
 * 카카오톡 메시지 전송 API
 * 주문 완료 후 선택한 친구에게 선물 링크를 전송합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, friend_id, friend_name, gift_message } = body

    if (!order_id || !friend_id) {
      return NextResponse.json({ error: '필수 정보가 없습니다.' }, { status: 400 })
    }

    // 주문 정보에서 선물 토큰 가져오기
    const { createSupabaseServerClient } = await import('@/lib/supabase-server')
    const supabase = createSupabaseServerClient()
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('gift_token, gift_info, id')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 선물 토큰 가져오기
    let giftToken = order.gift_token
    if (!giftToken && order.gift_info) {
      try {
        const giftInfo = typeof order.gift_info === 'string' 
          ? JSON.parse(order.gift_info) 
          : order.gift_info
        giftToken = giftInfo.token
      } catch (e) {
        console.error('gift_info 파싱 실패:', e)
      }
    }

    if (!giftToken) {
      return NextResponse.json({ error: '선물 토큰을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 선물 링크 생성
    const giftLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift/receive/${giftToken}`

    // 카카오톡 메시지 전송
    // 실제로는 카카오톡 메시지 API를 사용해야 하지만,
    // 여기서는 카카오톡 공유 API를 사용하거나, 
    // 카카오톡 메시지 API를 서버에서 호출해야 합니다.
    
    // 카카오톡 메시지 API는 서버 사이드에서만 사용 가능하므로,
    // 여기서는 메시지 전송 로직을 구현합니다.
    
    // 실제 구현 시 카카오톡 메시지 API를 사용해야 합니다:
    // https://developers.kakao.com/docs/latest/ko/message/rest-api
    
    // 임시로 로그만 출력
    console.log('카카오톡 메시지 전송:', {
      friend_id,
      friend_name,
      gift_link: giftLink,
      gift_message,
    })

    // TODO: 실제 카카오톡 메시지 API 호출
    // 카카오톡 메시지 API를 사용하려면:
    // 1. 카카오톡 앱 키 설정
    // 2. 카카오톡 메시지 API 엔드포인트 호출
    // 3. 친구에게 메시지 전송

    return NextResponse.json({ 
      success: true, 
      message: '카카오톡 메시지 전송 요청이 완료되었습니다.' 
    })
  } catch (error: any) {
    console.error('카카오톡 메시지 전송 실패:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

