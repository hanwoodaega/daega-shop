'use client'

import { useState, useEffect } from 'react'
import type { LiveDrawWithEffectiveStatus } from '@/lib/livedraw/livedraw.types'
import { fetchLiveDraw } from '@/lib/livedraw/livedraw.service'

interface LiveDrawLiveProps {
  liveDraw: LiveDrawWithEffectiveStatus
}

export default function LiveDrawLive({ liveDraw: initialLiveDraw }: LiveDrawLiveProps) {
  const [liveDraw, setLiveDraw] = useState(initialLiveDraw)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 라이브 상태일 때만 폴링 (10초마다)
  useEffect(() => {
    if (liveDraw.effective_status !== 'live') return

    const interval = setInterval(async () => {
      try {
        const data = await fetchLiveDraw()
        if (data) {
          setLiveDraw(data)
        }
      } catch (error) {
        console.error('라이브 추첨 상태 업데이트 실패:', error)
      }
    }, 10000) // 10초마다

    return () => clearInterval(interval)
  }, [liveDraw.effective_status])

  const youtubeEmbedUrl = liveDraw.youtube_live_id
    ? `https://www.youtube.com/embed/${liveDraw.youtube_live_id}?autoplay=1`
    : null

  if (!youtubeEmbedUrl) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700">유튜브 라이브 ID가 설정되지 않았습니다.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full mb-4">
            <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
            <span className="font-bold">지금 라이브 추첨 중입니다</span>
          </div>
          <p className="text-gray-700">실시간으로 추첨 과정을 확인하세요.</p>
        </div>

        <div className="bg-black rounded-lg overflow-hidden shadow-lg mb-4">
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={youtubeEmbedUrl}
              className="absolute top-0 left-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="라이브 추첨"
            />
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {isFullscreen ? '일반 화면' : '전체화면 보기'}
          </button>
        </div>

        {liveDraw.description && (
          <div className="mt-6 bg-gray-50 rounded-lg p-6">
            <p className="text-gray-700 whitespace-pre-line">{liveDraw.description}</p>
          </div>
        )}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setIsFullscreen(false)}
              className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              닫기
            </button>
          </div>
          <div className="w-full h-full">
            <iframe
              src={youtubeEmbedUrl}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="라이브 추첨 (전체화면)"
            />
          </div>
        </div>
      )}
    </div>
  )
}

