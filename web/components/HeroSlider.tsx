'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface HeroSlide {
  id: string
  image_url: string
  link_url: string | null
  sort_order: number
}

export default function HeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const res = await fetch('/api/hero')
        const data = await res.json()
        if (res.ok && data.slides && data.slides.length > 0) {
          setSlides(data.slides)
        }
      } catch (error) {
        console.error('히어로 슬라이드 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSlides()
  }, [])

  // 자동 슬라이드 전환
  useEffect(() => {
    if (slides.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, 5000) // 5초마다 전환

    return () => clearInterval(interval)
  }, [slides.length])

  if (loading) {
    return (
      <section className="relative bg-black text-white overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        </div>
      </section>
    )
  }

  // 슬라이드가 없으면 기본 이미지 표시
  if (slides.length === 0) {
    return (
      <section className="relative bg-black text-white overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
          <Image
            src="/images/hero.jpg"
            alt="히어로 이미지"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>
      </section>
    )
  }

  return (
    <section className="relative bg-black text-white overflow-hidden">
      <div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
        {slides.map((slide, index) => {
          const slideContent = (
            <div
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={slide.image_url}
                alt={`히어로 이미지 ${index + 1}`}
                fill
                className="object-cover"
                sizes="100vw"
                priority={index === 0}
              />
            </div>
          )

          if (slide.link_url) {
            return (
              <Link
                key={slide.id}
                href={slide.link_url}
                className="block absolute inset-0"
              >
                {slideContent}
              </Link>
            )
          }

          return <div key={slide.id}>{slideContent}</div>
        })}
        
        {/* 인디케이터 */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                }`}
                aria-label={`슬라이드 ${index + 1}로 이동`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

