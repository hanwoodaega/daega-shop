'use client'

import { useEffect, useState, useCallback } from 'react'
import { createScrollToTopHandler, scrollToTop } from '@/lib/utils/utils'

interface ScrollToTopProps {
  threshold?: number
  className?: string
}

export default function ScrollToTop({ threshold = 300, className = '' }: ScrollToTopProps) {
  const [show, setShow] = useState(false)

  const handleScroll = useCallback(
    createScrollToTopHandler(threshold, setShow),
    [threshold]
  )

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (!show) return null

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-24 right-6 z-50 bg-white/90 backdrop-blur-sm text-gray-600 p-3 rounded-full shadow-lg hover:bg-white hover:scale-110 transition ${className}`}
      aria-label="맨 위로"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  )
}


