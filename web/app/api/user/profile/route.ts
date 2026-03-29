import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// GET: 사용자 프로필 정보 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: statusRow, error: statusError } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    if (statusError) {
      return dbErrorResponse('user profile GET status', statusError)
    }

    if (statusRow?.status === 'deleted') {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
    }

    // 사용자 정보 조회
    const { data: profile, error } = await supabase
      .from('users')
      .select('name, phone, birthday')
      .eq('id', user.id)
      .single()

    if (error) {
      return dbErrorResponse('user profile GET', error)
    }

    return NextResponse.json({ profile: profile || null })
  } catch (error: unknown) {
    return unknownErrorResponse('user profile GET', error)
  }
}

// PUT: 사용자 프로필 수정
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const { data: statusRow, error: statusError } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    if (statusError) {
      return dbErrorResponse('user profile PUT status', statusError)
    }

    if (statusRow?.status === 'deleted') {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, birthday } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      updateData.name = name.trim()
    }
    if (phone !== undefined) {
      updateData.phone = phone
    }
    if (birthday !== undefined) {
      updateData.birthday = birthday || null
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('user profile PUT', error)
    }

    return NextResponse.json({ profile: data })
  } catch (error: unknown) {
    return unknownErrorResponse('user profile PUT', error)
  }
}

// POST: 사용자 프로필 생성/업데이트 (upsert)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const { data: statusRow, error: statusError } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    if (statusError) {
      return dbErrorResponse('user profile POST status', statusError)
    }

    if (statusRow?.status === 'deleted') {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, birthday } = body

    const upsertData: any = {
      id: user.id,
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      upsertData.name = name
    }
    if (phone !== undefined) {
      upsertData.phone = phone
    }
    if (birthday !== undefined) {
      upsertData.birthday = birthday || null
    }

    const { data, error } = await supabase
      .from('users')
      .upsert(upsertData, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      return dbErrorResponse('user profile POST', error)
    }

    return NextResponse.json({ profile: data })
  } catch (error: unknown) {
    return unknownErrorResponse('user profile POST', error)
  }
}

