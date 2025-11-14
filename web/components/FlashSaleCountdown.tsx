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

  return (
    <div className={`flex items-center ${className}`}>
      <span className="text-lg font-bold text-red-600">
        D-{days} {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
      </span>
    </div>
  )
}

