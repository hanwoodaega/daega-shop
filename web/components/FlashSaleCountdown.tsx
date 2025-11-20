'use client'

import { useEffect, useState } from 'react'
import { Product } from '@/lib/supabase'
import { getFlashSaleRemainingSeconds } from '@/lib/product-utils'

interface FlashSaleCountdownProps {
  product: Product
  className?: string
}

export default function FlashSaleCountdown({ product, className = '' }: FlashSaleCountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    getFlashSaleRemainingSeconds(product)
  )

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return
    }

    const interval = setInterval(() => {
      const newRemaining = getFlashSaleRemainingSeconds(product)
      setRemainingSeconds(newRemaining)
      
      if (newRemaining === null || newRemaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [product, remainingSeconds])

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
        <span className={`${textSizeClass} font-bold text-red-600`}>
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

