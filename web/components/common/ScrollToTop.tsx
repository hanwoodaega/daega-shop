'use client'

import { useEffect, useState, useCallback } from 'react'
import { createScrollToTopHandler, scrollToTop } from '@/lib/utils'

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
      className={`fixed bottom-20 right-4 z-50 bg-primary-600 text-white p-3 rounded-full shadow-lg hover:bg-primary-700 transition ${className}`}
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

