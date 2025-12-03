import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * 사용자 약관 동의 저장 API
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { terms } = body

    if (!terms || typeof terms !== 'object') {
      return NextResponse.json({ error: '약관 동의 정보가 필요합니다.' }, { status: 400 })
    }

    // 약관 타입 정의
    const termsTypes = ['service', 'privacy', 'third_party', 'age14', 'marketing']
    const now = new Date().toISOString()

    // 모든 약관 타입에 대해 레코드 생성/업데이트
    const termsRecords = termsTypes.map(termsType => {
      const agreed = terms[termsType] === true
      return {
        user_id: user.id,
        terms_type: termsType,
        agreed,
        agreed_at: agreed ? now : null,
      }
    })

    // upsert로 저장 (이미 있으면 업데이트, 없으면 생성)
    const { error: insertError } = await supabase
      .from('user_terms')
      .upsert(termsRecords, {
        onConflict: 'user_id,terms_type',
      })

    if (insertError) {
      console.error('약관 동의 저장 실패:', insertError)
      return NextResponse.json({ error: '약관 동의 저장에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '약관 동의가 저장되었습니다.' })
  } catch (error: any) {
    console.error('약관 동의 저장 에러:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

