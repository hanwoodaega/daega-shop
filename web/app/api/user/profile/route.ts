import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// GET: 사용자 프로필 정보 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
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
      return NextResponse.json({ error: '사용자 상태 조회 실패' }, { status: 500 })
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
      console.error('사용자 정보 조회 실패:', error)
      return NextResponse.json({ error: '사용자 정보 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ profile: profile || null })
  } catch (error: any) {
    console.error('사용자 정보 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// PUT: 사용자 프로필 수정
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()
    const { data: statusRow, error: statusError } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    if (statusError) {
      return NextResponse.json({ error: '사용자 상태 조회 실패' }, { status: 500 })
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
      console.error('사용자 프로필 수정 실패:', error)
      return NextResponse.json({ error: '사용자 프로필 수정 실패' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (error: any) {
    console.error('사용자 프로필 수정 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// POST: 사용자 프로필 생성/업데이트 (upsert)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()
    const { data: statusRow, error: statusError } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    if (statusError) {
      return NextResponse.json({ error: '사용자 상태 조회 실패' }, { status: 500 })
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
      console.error('사용자 프로필 생성/업데이트 실패:', error)
      return NextResponse.json({ error: '사용자 프로필 생성/업데이트 실패' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (error: any) {
    console.error('사용자 프로필 생성/업데이트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

