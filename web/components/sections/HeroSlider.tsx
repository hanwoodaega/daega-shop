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

/** 모바일 3패널 트랙: translateX %는 트랙 너비 기준, 한 칸 = 100/3 */
const MOBILE_TX_CURR = -100 / 3
const MOBILE_TX_NEXT = -200 / 3
const MOBILE_TX_PREV = 0

export default function HeroSlider({ initialSlides }: HeroSliderProps) {
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides ?? [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)
  const [mobileTransitionEnabled, setMobileTransitionEnabled] = useState(true)
  const [mobileTranslatePct, setMobileTranslatePct] = useState(MOBILE_TX_CURR)
  const [mobileAnimating, setMobileAnimating] = useState(false)

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
      }
    }

    fetchSlides()
  }, [initialSlides])

  const slideCount = slides.length

  const visibleSlides = useMemo(() => {
    if (slideCount === 0) return [] as HeroSlide[]

    const group: HeroSlide[] = []
    const maxTiles = Math.min(4, slideCount)
    for (let offset = 0; offset < maxTiles; offset++) {
      const idx = (currentIndex + offset) % slideCount
      group.push(slides[idx])
    }
    return group
  }, [slides, slideCount, currentIndex])

  const mobileTriplet = useMemo(() => {
    if (slideCount === 0) return [] as HeroSlide[]
    const prev = slides[(currentIndex - 1 + slideCount) % slideCount]
    const curr = slides[currentIndex]
    const next = slides[(currentIndex + 1) % slideCount]
    return [prev, curr, next]
  }, [slides, slideCount, currentIndex])

  const scheduleMobileReset = (nextIndex: number) => {
    window.setTimeout(() => {
      setMobileTransitionEnabled(false)
      setCurrentIndex(nextIndex)
      setMobileTranslatePct(MOBILE_TX_CURR)
      window.setTimeout(() => {
        setMobileTransitionEnabled(true)
        setMobileAnimating(false)
      }, 30)
    }, 600)
  }

  useEffect(() => {
    if (slideCount <= 1) return

    const interval = setInterval(() => {
      if (typeof window === 'undefined') return
      if (isDesktop) {
        setCurrentIndex((prev) => (prev + 1) % slideCount)
        return
      }
      if (mobileAnimating) return
      setMobileAnimating(true)
      setMobileTranslatePct(MOBILE_TX_NEXT)
      const nextIndex = (currentIndex + 1) % slideCount
      scheduleMobileReset(nextIndex)
    }, 4000)

    return () => clearInterval(interval)
  }, [slideCount, isDesktop, mobileAnimating, currentIndex])

  const handlePrev = () => {
    if (slideCount <= 1) return
    if (isDesktop) {
      setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount)
      return
    }
    if (mobileAnimating) return
    setMobileAnimating(true)
    setMobileTranslatePct(MOBILE_TX_PREV)
    const nextIndex = (currentIndex - 1 + slideCount) % slideCount
    scheduleMobileReset(nextIndex)
  }

  const handleNext = () => {
    if (slideCount <= 1) return
    if (isDesktop) {
      setCurrentIndex((prev) => (prev + 1) % slideCount)
      return
    }
    if (mobileAnimating) return
    setMobileAnimating(true)
    setMobileTranslatePct(MOBILE_TX_NEXT)
    const nextIndex = (currentIndex + 1) % slideCount
    scheduleMobileReset(nextIndex)
  }

  const renderTile = (slide: HeroSlide, shouldPriority: boolean) => {
    const image = (
      <Image
        src={slide.image_url}
        alt="프로모션 배너"
        fill
        className="object-contain object-center"
        sizes="(min-width: 1024px) 480px, 100vw"
        priority={shouldPriority}
        loading={shouldPriority ? 'eager' : 'lazy'}
      />
    )

    if (slide.link_url) {
      return (
        <Link
          href={slide.link_url}
          prefetch={false}
          className="relative block h-full min-h-0 w-full overflow-hidden bg-white"
        >
          {image}
        </Link>
      )
    }

    return (
      <div className="relative h-full min-h-0 w-full overflow-hidden bg-white">
        {image}
      </div>
    )
  }

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="w-full relative">
        {mobileTriplet.length === 3 && (
          <div className="relative w-full aspect-[5/3] lg:hidden overflow-hidden bg-white">
            <div
              className="flex h-full w-[300%] flex-row"
              style={{
                transform: `translateX(${mobileTranslatePct}%)`,
                transition: mobileTransitionEnabled ? 'transform 600ms ease' : 'none',
              }}
            >
              {mobileTriplet.map((slide, idx) => (
                <div
                  key={`${slide.id}-${idx}`}
                  className="relative h-full w-1/3 min-h-0 shrink-0"
                >
                  {renderTile(slide, idx === 1)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="hidden lg:block px-2 pt-0 pb-2">
          <div className="relative h-[288px] w-full overflow-hidden bg-white">
            {visibleSlides.map((slide, idx) => {
              const maxTiles = Math.min(4, slideCount)
              const centerIndex = (maxTiles - 1) / 2
              const offset = idx - centerIndex
              return (
                <div
                  key={`${slide.id}-${idx}`}
                  className="absolute top-0 left-1/2 h-[288px] w-[480px] transition-transform duration-700 will-change-transform"
                  style={{
                    transform: `translateX(calc(-50% + ${offset} * (480px + 8px)))`,
                  }}
                >
                  {renderTile(slide, true)}
                  {idx === 2 && slideCount > 1 && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                      {currentIndex + 1}/{slideCount}
                    </div>
                  )}
                </div>
              )
            })}

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

        {slideCount > 1 && (
          <>
            <div className="absolute bottom-2 right-3 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium lg:hidden">
              {currentIndex + 1}/{slideCount}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

