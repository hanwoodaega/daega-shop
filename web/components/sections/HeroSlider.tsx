'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface HeroSlide {
  id: string
  image_url: string
  link_url: string | null
  sort_order: number
}

interface HeroSliderProps {
  initialSlides?: HeroSlide[]
}

export default function HeroSlider({ initialSlides }: HeroSliderProps) {
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides ?? [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(!initialSlides)
  const [isDesktop, setIsDesktop] = useState(false)

  // 화면 크기 기준으로 데스크톱 여부 판별 (lg 기준)
  useEffect(() => {
    const updateIsDesktop = () => {
      if (typeof window === 'undefined') return
      setIsDesktop(window.innerWidth >= 1024)
    }
    updateIsDesktop()
    window.addEventListener('resize', updateIsDesktop)
    return () => window.removeEventListener('resize', updateIsDesktop)
  }, [])

  useEffect(() => {
    if (initialSlides && initialSlides.length > 0) {
      setLoading(false)
      return
    }

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
  }, [initialSlides])

  const slideCount = slides.length

  // 현재 인덱스를 기준으로, 모바일/탭은 1장, PC는 4장을 보여줌
  const visibleSlides = useMemo(() => {
    if (slideCount === 0) return [] as HeroSlide[]

    if (!isDesktop) {
      return [slides[currentIndex]]
    }

    const group: HeroSlide[] = []
    const maxTiles = Math.min(4, slideCount)
    for (let offset = 0; offset < maxTiles; offset++) {
      const idx = (currentIndex + offset) % slideCount
      group.push(slides[idx])
    }
    return group
  }, [slides, slideCount, isDesktop, currentIndex])

  // 자동 슬라이드 전환 (4초마다 한 장씩)
  useEffect(() => {
    if (slideCount <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideCount)
    }, 4000)

    return () => clearInterval(interval)
  }, [slideCount])

  const handlePrev = () => {
    if (slideCount <= 1) return
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount)
  }

  const handleNext = () => {
    if (slideCount <= 1) return
    setCurrentIndex((prev) => (prev + 1) % slideCount)
  }

  const renderTile = (slide: HeroSlide, key: string, shouldPriority: boolean) => {
    const image = (
      <Image
        src={slide.image_url}
        alt="프로모션 배너"
        fill
        className="object-cover"
        // PC에서는 가운데 2장(각 480px), 모바일/탭에서는 전체 너비 사용
        sizes="(min-width: 1024px) 480px, 100vw"
        priority={shouldPriority}
      />
    )

    if (slide.link_url) {
      return (
        <Link
          key={key}
          href={slide.link_url}
          prefetch={false}
          className="relative block w-full h-full overflow-hidden"
        >
          {image}
        </Link>
      )
    }

    return (
      <div key={key} className="relative w-full h-full overflow-hidden">
        {image}
      </div>
    )
  }

  return (
    <section className="relative overflow-hidden">
      <div className="w-full relative">
        {/* 모바일/태블릿: 5:3 배너 1장 */}
        {visibleSlides[0] && (
          <div className="relative w-full aspect-[5/3] lg:hidden">
            {renderTile(visibleSlides[0], visibleSlides[0].id, true)}
          </div>
        )}

        {/* PC: 가운데 2장은 1000px 고정, 양옆은 화면 여유에 따라 노출 */}
        <div className="hidden lg:block px-2 pt-0 pb-2">
          <div className="relative max-w-[1000px] mx-auto h-[288px] overflow-visible">
            {visibleSlides.map((slide, idx) => {
              const offset = idx - 1 // -1,0,1,2
              return (
                <div
                  key={slide.id}
                  className="absolute top-0 w-[480px] h-[288px] transition-transform duration-700"
                    style={{
                    left: `calc(${offset} * (480px + 8px))`,
                    transitionDelay: `${idx * 120}ms`,
                  }}
                >
                  {renderTile(slide, `${slide.id}-${idx}`, idx === 1)}
                  {idx === 2 && slideCount > 1 && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                      {currentIndex + 1}/{slideCount}
                    </div>
                  )}
                </div>
              )
            })}

            {/* 좌/우 화살표 (1000px 영역 양옆) */}
            {slideCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="이전 슬라이드"
                  className="absolute left-0 top-1/2 -translate-x-10 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="다음 슬라이드"
                  className="absolute right-0 top-1/2 translate-x-10 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 인디케이터: 현재 이미지 / 전체 이미지 (모바일/탭: 오른쪽 하단, PC: 3번째 타일) */}
        {slideCount > 1 && (
          <>
            {/* 모바일/탭 */}
            <div className="absolute bottom-2 right-3 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium lg:hidden">
              {currentIndex + 1}/{slideCount}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

