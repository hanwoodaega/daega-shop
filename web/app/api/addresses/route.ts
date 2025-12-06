import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// GET: 사용자 주소 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()
    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('주소 조회 실패:', error)
      return NextResponse.json({ error: '주소 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ addresses: addresses || [] })
  } catch (error: any) {
    console.error('주소 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// POST: 주소 추가
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()
    const body = await request.json()
    const { name, recipient_name, recipient_phone, zipcode, address, address_detail, delivery_note, is_default } = body

    // 기본 주소로 설정하는 경우, 기존 기본 주소 해제
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    // 새 주소 추가
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
        name,
        recipient_name,
        recipient_phone,
        zipcode: zipcode || null,
        address,
        address_detail: address_detail || null,
        delivery_note: delivery_note || null,
        is_default: is_default || false,
      })
      .select()
      .single()

    if (error) {
      console.error('주소 추가 실패:', error)
      return NextResponse.json({ error: '주소 추가 실패' }, { status: 500 })
    }

    return NextResponse.json({ address: data })
  } catch (error: any) {
    console.error('주소 추가 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

