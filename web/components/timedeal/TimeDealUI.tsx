'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/supabase/supabase'
import TimeDealCountdown from './TimeDealCountdown'
import ProductCard from '../ProductCard'

interface TimeDealData {
  timedeal: {
    id: string
    title?: string | null
    description?: string | null
    end_at?: string | null
  }
  products: Product[]
  title?: string
}

interface TimeDealUIProps {
  data: TimeDealData
  variant?: 'scroll' | 'grid'
}

export function TimeDealUI({ data, variant = 'scroll' }: TimeDealUIProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const title = data.title || data.timedeal.title || '오늘만 특가!'
  const description = data.timedeal.description
  const endTime = data.timedeal.end_at
  const products = data.products || []

  if (products.length === 0) {
    return null
  }

  return (
    <section className="pt-8 overflow-x-hidden" style={{ backgroundColor: '#EF4444' }}>
      <div className="container mx-auto px-2">
        <div className="mb-8">
          <div className="flex flex-col gap-2 mb-3 w-[95%] mx-auto">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {/* 시계 이미지 */}
                <div className="flex-shrink-0 relative -ml-1" style={{ width: '48px', height: '48px' }}>
                  <Image
                    src="/images/timedealclock.png"
                    alt="타임딜 시계"
                    fill
                    className="object-contain"
                    sizes="48px"
                  />
                </div>
                <h2 
                  className="font-extrabold text-[34px]" 
                  style={{ 
                    color: '#FFFFFF',
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    textShadow: '2px 2px 0px #000000, -2px -2px 0px #000000, 2px -2px 0px #000000, -2px 2px 0px #000000, 0px 2px 0px #000000, 2px 0px 0px #000000, 0px -2px 0px #000000, -2px 0px 0px #000000'
                  }}
                >
                  {title}
                </h2>
              </div>
            </div>
          </div>
          {endTime && (
            <div className="flex items-center ml-4">
              <TimeDealCountdown endTime={endTime} className="text-2xl" />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white pt-4 pb-4 -mx-2 px-3 relative z-10">
        {description && (
          <div className="px-3 mb-4">
            <p 
              className="text-xl"
              style={{ 
                color: '#000000',
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 700
              }}
            >
              {description}
            </p>
          </div>
        )}
        {variant === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 px-3 bg-white">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <>
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto pb-2 px-3 bg-white"
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {products.map((product: any) => (
                <div key={product.id} className="flex-shrink-0 w-[180px]">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
            
            {/* 전체보기 버튼 */}
            <div className="mt-0 px-4 pb-4 bg-white">
              <Link href="/timedeal" prefetch={false} className="block">
                <button className="w-full px-2 py-2.5 rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2" style={{ backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #CCCCCC' }}>
                  <span>전체보기</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
      <div className="bg-white h-8 -mt-4"></div>
    </section>
  )
}

