'use client'

import { useEffect, useState } from 'react'

interface TimeDealCountdownProps {
  endTime?: string | null
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

export default function TimeDealCountdown({ endTime, className = '' }: TimeDealCountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    getRemainingSeconds(endTime)
  )

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return
    }

    const interval = setInterval(() => {
      const newRemaining = getRemainingSeconds(endTime)
      setRemainingSeconds(newRemaining)
      
      if (newRemaining === null || newRemaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [endTime, remainingSeconds])

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
        <span 
          className="mr-2" 
          style={{ 
            color: '#f9df70',
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 700,
            fontSize: '26px',
            textShadow: '1px 1px 0px #000000, -1px -1px 0px #000000, 1px -1px 0px #000000, -1px 1px 0px #000000, 0px 1px 0px #000000, 1px 0px 0px #000000, 0px -1px 0px #000000, -1px 0px 0px #000000'
          }}
        >
          D-{days}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div 
          className="rounded-[4px] flex items-center justify-center" 
          style={{ 
            backgroundColor: '#f9df70',
            border: '1px solid #000000',
            padding: '4px 16px',
            width: '60px',
            boxSizing: 'border-box',
            fontWeight: 800,
            boxShadow: '0 3px 6px rgba(0,0,0,0.15)'
          }}
        >
          <span 
            style={{ 
              color: '#0F0F0F',
              fontFamily: 'SUIT Variable, Pretendard, sans-serif',
              fontWeight: 900,
              fontSize: '26px',
              letterSpacing: '-1px'
            }}
          >
            {formatTime(hours)}
          </span>
        </div>
        <span 
          style={{ 
            color: '#0F0F0F',
            fontFamily: 'SUIT Variable, Pretendard, sans-serif',
            fontWeight: 900,
            fontSize: '26px',
            letterSpacing: '-1px'
          }}
        >
          :
        </span>
        <div 
          className="rounded-[4px] flex items-center justify-center" 
          style={{ 
            backgroundColor: '#f9df70',
            border: '1px solid #000000',
            padding: '4px 16px',
            width: '60px',
            boxSizing: 'border-box',
            fontWeight: 800,
            boxShadow: '0 3px 6px rgba(0,0,0,0.15)'
          }}
        >
          <span 
            style={{ 
              color: '#0F0F0F',
              fontFamily: 'SUIT Variable, Pretendard, sans-serif',
              fontWeight: 900,
              fontSize: '26px',
              letterSpacing: '-1px'
            }}
          >
            {formatTime(minutes)}
          </span>
        </div>
        <span 
          style={{ 
            color: '#0F0F0F',
            fontFamily: 'SUIT Variable, Pretendard, sans-serif',
            fontWeight: 900,
            fontSize: '26px',
            letterSpacing: '-1px'
          }}
        >
          :
        </span>
        <div 
          className="rounded-[4px] flex items-center justify-center" 
          style={{ 
            backgroundColor: '#f9df70',
            border: '1px solid #000000',
            padding: '4px 16px',
            width: '60px',
            boxSizing: 'border-box',
            fontWeight: 800,
            boxShadow: '0 3px 6px rgba(0,0,0,0.15)'
          }}
        >
          <span 
            style={{ 
              color: '#0F0F0F',
              fontFamily: 'SUIT Variable, Pretendard, sans-serif',
              fontWeight: 900,
              fontSize: '26px',
              letterSpacing: '-1px'
            }}
          >
            {formatTime(seconds)}
          </span>
        </div>
      </div>
    </div>
  )
}

