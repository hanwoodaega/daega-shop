import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const { authKey, customerKey } = await request.json()
    if (!authKey || !customerKey) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: '결제 설정이 없습니다.' }, { status: 500 })
    }

    const auth = Buffer.from(`${secretKey}:`).toString('base64')
    const issueRes = await fetch(`https://api.tosspayments.com/v1/billing/authorizations/${authKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerKey }),
    })

    if (!issueRes.ok) {
      const errorData = await issueRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: '카드 등록에 실패했습니다.', details: errorData },
        { status: 400 }
      )
    }

    const data = await issueRes.json()
    if (!data?.billingKey) {
      return NextResponse.json({ error: '카드 인증 정보가 유효하지 않습니다.' }, { status: 400 })
    }

    const cardNumberRaw = data?.card?.number || data?.card?.cardNumber || ''
    const last4 = cardNumberRaw.replace(/[^0-9]/g, '').slice(-4)
    const maskedNumber = last4 ? `**** **** **** ${last4}` : '**** **** **** ****'

    const supabaseAdmin = createSupabaseAdminClient()

    await supabaseAdmin
      .from('payment_cards')
      .update({ is_default: false })
      .eq('user_id', user.id)

    const { error } = await supabaseAdmin
      .from('payment_cards')
      .insert({
        user_id: user.id,
        card_number: maskedNumber,
        card_company: data?.card?.company || data?.card?.issuerCode || null,
        card_type: data?.card?.cardType || null,
        card_last4: last4 || null,
        billing_key: data?.billingKey,
        customer_key: data?.customerKey,
        is_default: true,
      })

    if (error) {
      console.error('카드 등록 DB 저장 실패:', error)
      return NextResponse.json({ error: '카드 등록 저장에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('카드 등록 처리 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
