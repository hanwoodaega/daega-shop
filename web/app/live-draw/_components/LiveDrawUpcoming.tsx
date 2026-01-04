'use client'

import type { LiveDrawWithEffectiveStatus } from '@/lib/livedraw/livedraw.types'

interface LiveDrawUpcomingProps {
  liveDraw: LiveDrawWithEffectiveStatus
}

export default function LiveDrawUpcoming({ liveDraw }: LiveDrawUpcomingProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    
    return {
      date: `${year}년 ${month}월 ${day}일 (${weekday})`,
      time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    }
  }

  const { date, time } = formatDate(liveDraw.live_date)

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="text-2xl font-bold mb-2">{date}</div>
          <div className="text-xl text-gray-700">{time}</div>
        </div>

        {liveDraw.description && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <p className="text-gray-700 whitespace-pre-line">{liveDraw.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

