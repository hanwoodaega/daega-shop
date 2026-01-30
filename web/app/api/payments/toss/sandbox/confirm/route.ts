import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { paymentKey, orderId, amount } = await request.json()
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: '결제 설정이 없습니다.' }, { status: 500 })
    }

    const auth = Buffer.from(`${secretKey}:`).toString('base64')
    const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    const data = await confirmRes.json().catch(() => ({}))
    if (!confirmRes.ok) {
      return NextResponse.json({ error: '결제 승인에 실패했습니다.', details: data }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
