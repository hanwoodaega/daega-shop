import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// GET: 사용자 주소 목록 조회
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const supabase = await createSupabaseServerClient()
    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('id, user_id, name, recipient_name, recipient_phone, zipcode, address, address_detail, delivery_note, is_default, created_at, updated_at')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return dbErrorResponse('addresses GET', error)
    }

    return NextResponse.json({ addresses: addresses || [] })
  } catch (error: unknown) {
    return unknownErrorResponse('addresses GET', error)
  }
}

// POST: 주소 추가
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const supabase = await createSupabaseServerClient()
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
      .select('id, user_id, name, recipient_name, recipient_phone, zipcode, address, address_detail, delivery_note, is_default, created_at, updated_at')
      .single()

    if (error) {
      return dbErrorResponse('addresses POST', error)
    }

    return NextResponse.json({ address: data })
  } catch (error: unknown) {
    return unknownErrorResponse('addresses POST', error)
  }
}

