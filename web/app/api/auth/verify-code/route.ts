import { NextRequest, NextResponse } from 'next/server'

/**
 * 인증번호 검증 API
 * POST /api/auth/verify-code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code } = body

    if (!phone || !code) {
      return NextResponse.json({ error: '전화번호와 인증번호가 필요합니다.' }, { status: 400 })
    }

    // 전화번호 형식 검증
    const phoneNumber = phone.replace(/[^0-9]/g, '')
    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      return NextResponse.json({ error: '올바른 전화번호 형식이 아닙니다.' }, { status: 400 })
    }

    // 인증번호 검증 (실제로는 Redis나 DB에서 확인)
    // TODO: Redis 또는 데이터베이스에서 인증번호 확인
    // 여기서는 임시로 구현
    const isValid = await verifyCode(phoneNumber, code)

    if (!isValid) {
      return NextResponse.json({ 
        error: '인증번호가 일치하지 않거나 만료되었습니다.' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '인증이 완료되었습니다.' 
    })
  } catch (error: any) {
    console.error('인증번호 검증 오류:', error)
    return NextResponse.json({ 
      error: error.message || '서버 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}

/**
 * 인증번호 검증 (임시 구현)
 * TODO: Redis 또는 데이터베이스로 변경 필요
 */
async function verifyCode(phone: string, code: string): Promise<boolean> {
  // 실제로는 Redis나 데이터베이스에서 저장된 인증번호를 확인해야 합니다
  // 여기서는 임시로 항상 true를 반환 (실제 구현 필요)
  // TODO: 실제 인증번호 검증 로직 구현
  
  // 개발 환경에서는 간단하게 검증
  if (process.env.NODE_ENV === 'development') {
    // 개발 환경에서는 6자리 숫자면 통과 (실제로는 저장된 값과 비교)
    return /^\d{6}$/.test(code)
  }

  // 운영 환경에서는 실제 저장된 인증번호와 비교
  // TODO: Redis 또는 데이터베이스에서 확인
  return false
}

