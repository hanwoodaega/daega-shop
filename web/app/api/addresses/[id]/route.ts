import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// PUT: 주소 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const body = await request.json()
    const { name, recipient_name, recipient_phone, zipcode, address, address_detail, delivery_note, is_default } = body

    // 기본 주소로 설정하는 경우, 기존 기본 주소 해제
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
        .neq('id', id)
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
      .eq('id', id)
      .eq('user_id', user.id) // 본인 주소만 수정 가능
      .select()
      .single()

    if (error) {
      return dbErrorResponse('addresses/[id] PUT', error)
    }

    return NextResponse.json({ address: data })
  } catch (error: unknown) {
    return unknownErrorResponse('addresses/[id] PUT', error)
  }
}

// DELETE: 주소 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    // 주소 삭제 (본인 주소만 삭제 가능)
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return dbErrorResponse('addresses/[id] DELETE', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('addresses/[id] DELETE', error)
  }
}


