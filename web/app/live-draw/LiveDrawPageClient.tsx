'use client'

import { useEffect, useState } from 'react'
import { fetchLiveDraw } from '@/lib/livedraw/livedraw.service'
import type { LiveDrawWithEffectiveStatus } from '@/lib/livedraw/livedraw.types'
import LiveDrawUpcoming from './_components/LiveDrawUpcoming'
import LiveDrawLive from './_components/LiveDrawLive'
import LiveDrawEnded from './_components/LiveDrawEnded'

export default function LiveDrawPageClient() {
  const [liveDraw, setLiveDraw] = useState<LiveDrawWithEffectiveStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLiveDraw = async () => {
      try {
        const data = await fetchLiveDraw()
        setLiveDraw(data)
      } catch (error) {
        console.error('라이브 추첨 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLiveDraw()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  if (!liveDraw) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-500">
          라이브 추첨 정보가 없습니다.
        </div>
      </div>
    )
  }

  // 상태별 컴포넌트 렌더링
  if (liveDraw.effective_status === 'live') {
    return <LiveDrawLive liveDraw={liveDraw} />
  } else if (liveDraw.effective_status === 'ended') {
    return <LiveDrawEnded liveDraw={liveDraw} />
  } else {
    return <LiveDrawUpcoming liveDraw={liveDraw} />
  }
}

