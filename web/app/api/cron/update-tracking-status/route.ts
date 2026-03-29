import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/auth/internal-job-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron Trigger: Render Cron에서 호출되는 트리거 엔드포인트
 * Worker 서비스를 트리거만 하고, 실제 작업은 Worker에서 수행
 * 
 * 구조:
 * [Render Cron] → [이 엔드포인트] → [Render Worker] → [Supabase]
 */
export async function GET(request: NextRequest) {
  try {
    const denied = requireCronSecret(request)
    if (denied) return denied

    const workerAuth =
      process.env.WORKER_SECRET?.trim() || process.env.CRON_SECRET?.trim()

    // Worker 서비스 URL (환경 변수에서 가져오거나 자동 감지)
    const workerUrl = process.env.WORKER_SERVICE_URL || process.env.RENDER_SERVICE_URL?.replace('web', 'worker')
    
    if (!workerUrl) {
      return NextResponse.json({ 
        error: 'Worker 서비스 URL이 설정되지 않았습니다. WORKER_SERVICE_URL 환경 변수를 설정해주세요.' 
      }, { status: 500 })
    }

    const workerEndpoint = `${workerUrl}/api/worker/update-tracking-status`
    
    console.log(`[Cron Trigger] Worker 서비스 트리거: ${workerEndpoint}`)

    // Worker 서비스 호출
    const response = await fetch(workerEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerAuth ? { Authorization: `Bearer ${workerAuth}` } : {}),
      },
      // 타임아웃 설정 (Worker가 오래 걸릴 수 있으므로 충분히 설정)
      signal: AbortSignal.timeout(300000) // 5분
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Cron Trigger] Worker 호출 실패: ${response.status} - ${errorText}`)
      return NextResponse.json({ 
        error: `Worker 호출 실패: ${response.status}`,
        details: errorText
      }, { status: response.status })
    }

    const result = await response.json()
    
    console.log(`[Cron Trigger] Worker 작업 완료:`, result)

    return NextResponse.json({
      message: 'Worker 작업이 트리거되었습니다.',
      triggered: true,
      workerResult: result,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Cron Trigger] Worker 트리거 실패:', error)
    
    // 타임아웃 오류 처리
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return NextResponse.json({ 
        error: 'Worker 호출 타임아웃',
        message: 'Worker가 응답하지 않았지만 작업은 계속 진행 중일 수 있습니다.'
      }, { status: 504 })
    }

    return NextResponse.json({ 
      error: error.message || '서버 오류',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

