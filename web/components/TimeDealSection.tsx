'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Product, isSupabaseConfigured } from '@/lib/supabase'
import TimeDealCountdown from './TimeDealCountdown'
import ProductCardSkeleton from './skeletons/ProductCardSkeleton'
import ProductCard from './ProductCard'

interface TimeDealSectionProps {
  variant?: 'scroll' | 'grid' // 'scroll': 가로 스크롤 (기본), 'grid': 2열 그리드
}

export default function TimeDealSection({ variant = 'scroll' }: TimeDealSectionProps) {
  const [timeDealProducts, setTimeDealProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [timeDealTitle, setTimeDealTitle] = useState('오늘만 특가!')
  const [timeDealDescription, setTimeDealDescription] = useState<string | null>(null)
  const [timeDealEndTime, setTimeDealEndTime] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchTimeDealProducts = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        // 타임딜 조회 (새로운 timedeals 테이블 구조)
        // grid 모드일 때는 더 많은 상품을 가져옴
        const limit = variant === 'grid' ? 100 : 10
        const response = await fetch(`/api/collections/timedeal?limit=${limit}`)
        
        if (!response.ok) {
          setTimeDealProducts([])
          setLoading(false)
          return
        }

        const data = await response.json()
        
        // 타임딜이 없거나 상품이 없으면 빈 배열 반환
        if (!data.timedeal || !data.products || data.products.length === 0) {
          setTimeDealProducts([])
          setLoading(false)
          return
        }
        
        // 종료 시간이 지났는지 확인
        if (data.timedeal.end_at) {
          const now = new Date()
          const endTime = new Date(data.timedeal.end_at)
          if (endTime <= now) {
            setTimeDealProducts([])
            setLoading(false)
            return
          }
        }

        // 제목 설정
        if (data.title || data.timedeal.title) {
          setTimeDealTitle(data.title || data.timedeal.title)
        }

        // 설명 설정
        if (data.timedeal?.description) {
          setTimeDealDescription(data.timedeal.description)
        } else {
          setTimeDealDescription(null)
        }

        // 종료 시간 설정
        if (data.timedeal?.end_at) {
          setTimeDealEndTime(data.timedeal.end_at)
        }

        // 상품 데이터 변환
        const activeProducts = (data.products || []).map((product: any) => ({
          ...product
        } as Product))
        setTimeDealProducts(activeProducts as any)
      } catch (error) {
        console.error('타임딜 상품 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTimeDealProducts()
    
    // 1분마다 갱신 (타임딜 종료 확인)
    const interval = setInterval(fetchTimeDealProducts, 60000)
    return () => clearInterval(interval)
  }, [])


  if (loading) {
    return (
      <section className="py-6 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
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
                {timeDealTitle}
              </h2>
            </div>
          </div>
          {variant === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[180px]">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (timeDealProducts.length === 0) {
    return null
  }

  return (
      <section className="pt-8 overflow-x-hidden" style={{ backgroundColor: '#EF4444' }}>
        <div className="container mx-auto px-2">
          <div className="mb-8">
            <div className="flex flex-col gap-2 mb-3 w-[95%] mx-auto">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  {/* 시계 이미지 */}
                  <div className="flex-shrink-0 relative" style={{ width: '48px', height: '48px' }}>
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
                    {timeDealTitle}
                  </h2>
                </div>
              </div>
            </div>
            {timeDealEndTime && (
              <div className="flex items-center ml-4">
                <TimeDealCountdown endTime={timeDealEndTime} className="text-2xl" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white pt-4 pb-4 -mx-2 px-3 relative z-10">
          {timeDealDescription && (
            <div className="px-3 mb-4">
              <p 
                className="text-lg"
                style={{ 
                  color: '#000000',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 700
                }}
              >
                {timeDealDescription}
              </p>
            </div>
          )}
          {variant === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 px-3 bg-white">
              {timeDealProducts.map((product: any) => (
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
                {timeDealProducts.map((product: any) => (
                  <div key={product.id} className="flex-shrink-0 w-[180px]">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
              
              {/* 전체보기 버튼 */}
              <div className="mt-0 px-4 pb-4 bg-white">
                <Link href="/products?filter=flash-sale" className="block">
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

