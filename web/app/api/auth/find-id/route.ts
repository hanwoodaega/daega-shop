import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/find-id
 * 이름과 휴대폰 번호로 가입된 이메일(아이디) 찾기
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone } = body

    if (!name || !phone) {
      return NextResponse.json({ error: '이름과 휴대폰 번호를 입력해주세요.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 이름과 휴대폰 번호로 사용자 조회
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('email, created_at')
      .eq('name', name.trim())
      .eq('phone', phone.replace(/[^0-9]/g, '')) // 숫자만 추출하여 비교

    if (error) {
      console.error('Find ID error:', error)
      return NextResponse.json({ error: '정보 조회 중 오류가 발생했습니다.' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: '일치하는 사용자 정보가 없습니다.' }, { status: 404 })
    }

    // 보안을 위해 이메일 일부를 마스킹 처리할 수 있지만, 일단은 그대로 제공하거나 마스킹 선택 가능
    // 여기서는 전체를 보여주되, 가입일 등 추가 정보를 함께 제공
    const foundUsers = users.map(user => ({
      email: user.email,
      created_at: user.created_at
    }))

    return NextResponse.json({ users: foundUsers })
  } catch (error: any) {
    console.error('Find ID exception:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

