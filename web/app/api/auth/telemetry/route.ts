import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const event = body?.event
    const ts = body?.ts
    if (event && ts) {
      console.info('[auth-telemetry]', JSON.stringify({ ts, ...event }))
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
