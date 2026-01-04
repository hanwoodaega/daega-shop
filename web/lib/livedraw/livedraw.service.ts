import { LiveDraw, LiveDrawWithEffectiveStatus, LiveDrawStatus } from './livedraw.types'
import { getNowUTCISO } from '@/lib/utils/time-utils'

export interface FetchLiveDrawParams {
  signal?: AbortSignal
}

/**
 * 라이브 추첨 데이터 조회
 */
export async function fetchLiveDraw({
  signal,
}: FetchLiveDrawParams = {}): Promise<LiveDrawWithEffectiveStatus | null> {
  const res = await fetch(`/api/live-draw`, {
    cache: 'no-store',
    signal,
  })

  if (!res.ok) {
    return null
  }

  const data = await res.json()
  if (data.liveDraw) {
    return data.liveDraw as LiveDrawWithEffectiveStatus
  }

  return null
}

/**
 * live_date를 기준으로 자동 상태 계산
 */
export function calculateAutoStatus(liveDate: string): LiveDrawStatus {
  const now = new Date(getNowUTCISO())
  const live = new Date(liveDate)
  
  // 방송 시작 1시간 전부터 live로 간주 (여유 시간)
  const oneHourBefore = new Date(live.getTime() - 60 * 60 * 1000)
  
  // 방송 종료는 보통 1-2시간 정도로 가정 (실제로는 관리자가 ended로 변경)
  const twoHoursAfter = new Date(live.getTime() + 2 * 60 * 60 * 1000)
  
  if (now < oneHourBefore) {
    return 'upcoming'
  } else if (now >= oneHourBefore && now <= twoHoursAfter) {
    return 'live'
  } else {
    return 'ended'
  }
}

/**
 * effective_status 계산 (manual_status 우선, 없으면 auto_status)
 */
export function getEffectiveStatus(
  manualStatus: LiveDrawStatus | null,
  autoStatus: LiveDrawStatus
): LiveDrawStatus {
  return manualStatus ?? autoStatus
}

