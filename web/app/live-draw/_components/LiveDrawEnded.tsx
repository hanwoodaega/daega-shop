'use client'

import type { LiveDrawWithEffectiveStatus } from '@/lib/livedraw/livedraw.types'

interface LiveDrawEndedProps {
  liveDraw: LiveDrawWithEffectiveStatus
}

export default function LiveDrawEnded({ liveDraw }: LiveDrawEndedProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    return `${year}년 ${month}월 ${day}일`
  }

  const drawDate = formatDate(liveDraw.live_date)

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">🎉 {drawDate} 추첨이 완료되었습니다</h1>
          <p className="text-lg text-gray-700">
            추첨이 완료되었습니다.
          </p>
        </div>

        {liveDraw.youtube_replay_id && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">다시보기</h2>
            <div className="bg-black rounded-lg overflow-hidden">
              <div className="relative" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${liveDraw.youtube_replay_id}`}
                  className="absolute top-0 left-0 w-full h-full"
                  allow="encrypted-media"
                  allowFullScreen
                  title="라이브 추첨 다시보기"
                />
              </div>
            </div>
          </div>
        )}

        {liveDraw.description && (
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-gray-700 whitespace-pre-line">{liveDraw.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

