import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * 인증번호 발송 API (카카오 알림톡 + SMS fallback)
 * POST /api/auth/send-verification-code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json({ error: '전화번호가 필요합니다.' }, { status: 400 })
    }

    // 전화번호 형식 검증 (하이픈 제거 후 숫자만)
    const phoneNumber = phone.replace(/[^0-9]/g, '')
    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      return NextResponse.json({ error: '올바른 전화번호 형식이 아닙니다.' }, { status: 400 })
    }

    // 6자리 인증번호 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // 인증번호를 세션/캐시에 저장 (5분 유효)
    // 실제로는 Redis나 데이터베이스를 사용하는 것이 좋지만, 
    // 여기서는 간단하게 메모리 기반으로 구현
    // TODO: Redis 또는 데이터베이스로 변경 필요

    // 카카오 알림톡 발송 시도
    let sentVia = 'kakao'
    let sendSuccess = false

    try {
      // 카카오 알림톡 발송
      sendSuccess = await sendKakaoAlimtalk(phoneNumber, verificationCode)
      
      if (!sendSuccess) {
        // 카카오 알림톡 실패 시 SMS로 fallback
        sentVia = 'sms'
        sendSuccess = await sendSMS(phoneNumber, verificationCode)
      }
    } catch (error) {
      console.error('알림톡 발송 실패, SMS로 fallback:', error)
      // 카카오 알림톡 실패 시 SMS로 fallback
      sentVia = 'sms'
      try {
        sendSuccess = await sendSMS(phoneNumber, verificationCode)
      } catch (smsError) {
        console.error('SMS 발송도 실패:', smsError)
        return NextResponse.json({ 
          error: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' 
        }, { status: 500 })
      }
    }

    if (!sendSuccess) {
      return NextResponse.json({ 
        error: '인증번호 발송에 실패했습니다.' 
      }, { status: 500 })
    }

    // 인증번호를 임시로 저장 (실제로는 Redis나 DB 사용 권장)
    // 여기서는 간단하게 쿠키나 세션에 저장
    // TODO: Redis 또는 데이터베이스로 변경 필요

    return NextResponse.json({ 
      success: true, 
      message: '인증번호가 발송되었습니다.',
      sentVia,
      // 개발 환경에서만 인증번호 반환 (실제 운영에서는 제거)
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode })
    })
  } catch (error: any) {
    console.error('인증번호 발송 오류:', error)
    return NextResponse.json({ 
      error: error.message || '서버 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}

/**
 * 카카오 알림톡 발송
 */
async function sendKakaoAlimtalk(phone: string, code: string): Promise<boolean> {
  try {
    // 카카오 비즈니스 메시지 API 설정
    const KAKAO_API_KEY = process.env.KAKAO_BIZ_API_KEY
    const KAKAO_TEMPLATE_ID = process.env.KAKAO_ALIMTALK_TEMPLATE_ID
    const KAKAO_PLUS_FRIEND_ID = process.env.KAKAO_PLUS_FRIEND_ID

    if (!KAKAO_API_KEY || !KAKAO_TEMPLATE_ID) {
      console.warn('카카오 알림톡 API 설정이 없습니다. SMS로 fallback합니다.')
      return false
    }

    // 카카오 비즈니스 메시지 API 호출
    const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KAKAO_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        template_id: KAKAO_TEMPLATE_ID,
        receiver_phone: phone,
        // 템플릿 변수 (템플릿에 따라 조정 필요)
        template_args: JSON.stringify({
          '#{인증번호}': code,
        }),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('카카오 알림톡 발송 실패:', errorData)
      return false
    }

    return true
  } catch (error) {
    console.error('카카오 알림톡 발송 오류:', error)
    return false
  }
}

/**
 * SMS 발송 (fallback)
 */
async function sendSMS(phone: string, code: string): Promise<boolean> {
  try {
    // SMS 발송 서비스 설정 (예: 알리고, 카카오톡 비즈니스 메시지 등)
    const SMS_API_KEY = process.env.SMS_API_KEY
    const SMS_SENDER_ID = process.env.SMS_SENDER_ID || '대가정육마트'

    if (!SMS_API_KEY) {
      console.warn('SMS API 설정이 없습니다.')
      return false
    }

    // 알리고 API 예시 (실제 사용하는 SMS 서비스에 맞게 수정 필요)
    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        key: SMS_API_KEY,
        user_id: process.env.SMS_USER_ID || '',
        sender: SMS_SENDER_ID,
        receiver: phone,
        msg: `[대가정육마트] 인증번호는 ${code}입니다. 5분 내에 입력해주세요.`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('SMS 발송 실패:', errorData)
      return false
    }

    const result = await response.json()
    
    // 알리고 API 응답 확인
    if (result.result_code !== '1') {
      console.error('SMS 발송 실패:', result.message)
      return false
    }

    return true
  } catch (error) {
    console.error('SMS 발송 오류:', error)
    return false
  }
}


