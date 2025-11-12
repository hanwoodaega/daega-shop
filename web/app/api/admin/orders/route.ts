import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { VALID_ORDER_STATUSES } from '@/lib/constants'

// 환경 변수 확인
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 관리자 인증 확인 (쿠키 기반)
async function verifyAdmin() {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  return adminAuth?.value === '1'
}

// GET: 주문 목록 조회
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const deliveryType = searchParams.get('delivery_type')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price,
          product:products (
            name,
            image_url
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    // 필터 적용
    if (deliveryType) {
      query = query.eq('delivery_type', deliveryType)
    }
    
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      query = query.gte('created_at', startDate.toISOString())
                   .lte('created_at', endDate.toISOString())
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('주문 조회 실패:', error)
      return NextResponse.json({ error: '주문 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('주문 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PATCH: 주문 상태 변경
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { orderId, status } = body

    // 필수 필드 검증
    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId와 status는 필수입니다.' }, { status: 400 })
    }

    // 상태 유효성 검증
    if (!VALID_ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `올바른 주문 상태를 선택해주세요. (${VALID_ORDER_STATUSES.join(', ')})` 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('주문 상태 변경 실패:', error)
      return NextResponse.json({ error: '주문 상태 변경에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('주문 상태 변경 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

