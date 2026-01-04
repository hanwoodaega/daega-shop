export type LiveDrawStatus = 'upcoming' | 'live' | 'ended'

export interface LiveDraw {
  id: string
  status: LiveDrawStatus
  manual_status: LiveDrawStatus | null // 관리자 수동 설정 (우선순위 높음)
  live_date: string // ISO 8601 형식
  youtube_live_id: string | null
  youtube_replay_id: string | null
  title: string | null
  description: string | null
  created_at: string
  updated_at: string
}

// 클라이언트에서 사용할 실제 상태 (manual_status 우선, 없으면 status)
export interface LiveDrawWithEffectiveStatus extends LiveDraw {
  effective_status: LiveDrawStatus
}

export interface LiveDrawFormData {
  status: LiveDrawStatus
  manual_status: LiveDrawStatus | null
  live_date: string
  youtube_live_id: string
  youtube_replay_id: string
  title: string
  description: string
}

