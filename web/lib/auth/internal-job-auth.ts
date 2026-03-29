import { NextRequest, NextResponse } from 'next/server'

/**
 * Cron / 내부 스케줄이 호출하는 엔드포인트용.
 * 로컬·프로덕션 동일: `CRON_SECRET` 필수, `Authorization: Bearer <CRON_SECRET>` 일치해야 함.
 */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization')

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET must be configured' },
      { status: 503 }
    )
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * 배송 Worker 등이 웹앱을 호출할 때.
 * 로컬·프로덕션 동일: `WORKER_SECRET` 또는 `CRON_SECRET` 중 하나 필수, Bearer 일치.
 */
export function requireWorkerSharedSecret(request: NextRequest): NextResponse | null {
  const secret =
    process.env.WORKER_SECRET?.trim() || process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization')

  if (!secret) {
    return NextResponse.json(
      {
        error:
          'WORKER_SECRET or CRON_SECRET must be configured for worker endpoints',
      },
      { status: 503 }
    )
  }
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
