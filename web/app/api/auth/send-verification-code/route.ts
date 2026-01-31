import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { generateOtpCode, hashOtp, normalizePhone } from '@/lib/auth/otp-utils'

const OTP_EXPIRES_MINUTES = 5
const RESEND_COOLDOWN_SECONDS = 60
const MAX_DAILY_SENDS = 5
const LOCK_MINUTES = 10

/**
 * 인증번호 발송 API (카카오 알림톡 + SMS fallback)
 * POST /api/auth/send-verification-code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, purpose, username } = body

    if (!phone || !purpose) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    if (!['signup', 'find_id', 'reset_pw'].includes(purpose)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const phoneNumber = normalizePhone(phone)
    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      return NextResponse.json({ error: '올바른 전화번호 형식이 아닙니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    if (purpose === 'signup') {
      const { data: existingPhone } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', phoneNumber)
        .maybeSingle()

      if (existingPhone) {
        return NextResponse.json(
          {
            error: '이미 가입된 휴대폰 번호입니다.',
            code: 'PHONE_EXISTS',
            actions: ['login', 'find-id', 'reset-password'],
          },
          { status: 409 }
        )
      }

      if (username) {
        const { data: existingUsername } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('username', username.trim())
          .maybeSingle()

        if (existingUsername) {
          return NextResponse.json(
            { error: '이미 사용 중인 아이디입니다.', code: 'USERNAME_EXISTS' },
            { status: 409 }
          )
        }
      }
    }

    const now = new Date()
    const { data: latestOtp } = await supabaseAdmin
      .from('auth_otps')
      .select('*')
      .eq('phone', phoneNumber)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOtp?.locked_until && new Date(latestOtp.locked_until) > now) {
      const remaining = Math.ceil((new Date(latestOtp.locked_until).getTime() - now.getTime()) / 1000)
      return NextResponse.json(
        { error: '잠시 후 다시 시도해주세요.', retryAfter: remaining },
        { status: 429 }
      )
    }

    if (latestOtp?.resend_available_at && new Date(latestOtp.resend_available_at) > now) {
      const remaining = Math.ceil((new Date(latestOtp.resend_available_at).getTime() - now.getTime()) / 1000)
      return NextResponse.json(
        { error: '재전송 대기 시간이 남아있습니다.', retryAfter: remaining },
        { status: 429 }
      )
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: dailyCount } = await supabaseAdmin
      .from('auth_otps')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phoneNumber)
      .gte('created_at', since)

    if ((dailyCount || 0) >= MAX_DAILY_SENDS) {
      return NextResponse.json({ error: '하루 인증 시도 횟수를 초과했습니다.' }, { status: 429 })
    }

    const verificationCode = generateOtpCode()

    let sentVia = 'kakao'
    let sendSuccess = false

    try {
      sendSuccess = await sendKakaoAlimtalk(phoneNumber, verificationCode)
      if (!sendSuccess) {
        sentVia = 'sms'
        sendSuccess = await sendSMS(phoneNumber, verificationCode)
      }
    } catch (error) {
      console.error('알림톡 발송 실패, SMS로 fallback:', error)
      sentVia = 'sms'
      try {
        sendSuccess = await sendSMS(phoneNumber, verificationCode)
      } catch (smsError) {
        console.error('SMS 발송도 실패:', smsError)
        return NextResponse.json(
          { error: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' },
          { status: 500 }
        )
      }
    }

    if (!sendSuccess) {
      return NextResponse.json({ error: '인증번호 발송에 실패했습니다.' }, { status: 500 })
    }

    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000).toISOString()
    const resendAvailableAt = new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('auth_otps')
      .insert({
        phone: phoneNumber,
        purpose,
        code_hash: hashOtp(phoneNumber, verificationCode),
        expires_at: expiresAt,
        attempts: 0,
        resend_available_at: resendAvailableAt,
        locked_until: null,
      })

    if (insertError) {
      return NextResponse.json({ error: '인증번호 저장에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
      sentVia,
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode }),
    })
  } catch (error: any) {
    console.error('인증번호 발송 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 })
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



