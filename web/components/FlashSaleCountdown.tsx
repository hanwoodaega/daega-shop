'use client'

import { useEffect, useState } from 'react'

interface FlashSaleCountdownProps {
  flashSaleSettings?: { end_time?: string | null } | null
  className?: string
}

// 남은 시간 계산 (초 단위)
function getRemainingSeconds(endTime: string | null | undefined): number | null {
  if (!endTime) {
    return null
  }
  const end = new Date(endTime).getTime()
  const now = new Date().getTime()
  const remaining = Math.max(0, Math.floor((end - now) / 1000))
  return remaining > 0 ? remaining : null
}

export default function FlashSaleCountdown({ flashSaleSettings, className = '' }: FlashSaleCountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    getRemainingSeconds(flashSaleSettings?.end_time)
  )

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return
    }

    const interval = setInterval(() => {
      const newRemaining = getRemainingSeconds(flashSaleSettings?.end_time)
      setRemainingSeconds(newRemaining)
      
      if (newRemaining === null || newRemaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [flashSaleSettings, remainingSeconds])

  if (remainingSeconds === null || remainingSeconds <= 0) {
    return null
  }

  const days = Math.floor(remainingSeconds / 86400)
  const hours = Math.floor((remainingSeconds % 86400) / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60

  const formatTime = (num: number) => String(num).padStart(2, '0')

  // className에서 text- 크기 클래스 추출
  const textSizeMatch = className.match(/text-\w+/)
  const textSizeClass = textSizeMatch ? textSizeMatch[0] : 'text-xl'
  
  return (
    <div className="flex items-center gap-2">
      {days > 0 && (
        <span className={`${textSizeClass} font-bold text-red-600 mr-2`}>
          D-{days}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div className="bg-white px-3 py-2 rounded-md shadow-sm">
          <span className={`${textSizeClass} font-bold text-red-600`}>
            {formatTime(hours)}
          </span>
        </div>
        <span className={`${textSizeClass} font-bold text-red-600`}>:</span>
        <div className="bg-white px-3 py-2 rounded-md shadow-sm">
          <span className={`${textSizeClass} font-bold text-red-600`}>
            {formatTime(minutes)}
          </span>
        </div>
        <span className={`${textSizeClass} font-bold text-red-600`}>:</span>
        <div className="bg-white px-3 py-2 rounded-md shadow-sm">
          <span className={`${textSizeClass} font-bold text-red-600`}>
            {formatTime(seconds)}
          </span>
        </div>
      </div>
    </div>
  )
}

