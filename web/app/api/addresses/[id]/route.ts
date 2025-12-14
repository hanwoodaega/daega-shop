import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserFromServer } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// PUT: 주소 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { name, recipient_name, recipient_phone, zipcode, address, address_detail, delivery_note, is_default } = body

    // 기본 주소로 설정하는 경우, 기존 기본 주소 해제
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
        .neq('id', params.id)
    }

    // 주소 수정
    const { data, error } = await supabase
      .from('addresses')
      .update({
        name,
        recipient_name,
        recipient_phone,
        zipcode: zipcode || null,
        address,
        address_detail: address_detail || null,
        delivery_note: delivery_note || null,
        is_default: is_default || false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', user.id) // 본인 주소만 수정 가능
      .select()
      .single()

    if (error) {
      console.error('주소 수정 실패:', error)
      return NextResponse.json({ error: '주소 수정 실패' }, { status: 500 })
    }

    return NextResponse.json({ address: data })
  } catch (error: any) {
    console.error('주소 수정 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// DELETE: 주소 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 주소 삭제 (본인 주소만 삭제 가능)
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('주소 삭제 실패:', error)
      return NextResponse.json({ error: '주소 삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('주소 삭제 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}


