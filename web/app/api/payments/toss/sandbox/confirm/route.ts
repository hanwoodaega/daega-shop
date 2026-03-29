import { NextRequest, NextResponse } from 'next/server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { tossSandboxConfirmBodySchema } from '@/lib/validation/schemas/order-payment'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const parsed = await parseJsonBody(request, tossSandboxConfirmBodySchema)
    if (!parsed.ok) return parsed.response
    const { paymentKey, orderId, amount } = parsed.data

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
      console.error('[sandbox/confirm] toss confirm failed', confirmRes.status, data)
      return NextResponse.json(
        { error: '결제 승인에 실패했습니다.', code: 'TOSS_CONFIRM_FAILED' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    return unknownErrorResponse('payments/toss/sandbox/confirm', error)
  }
}
