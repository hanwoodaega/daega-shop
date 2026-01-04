'use client'

import Image from 'next/image'
import TimeDealCountdown from '@/components/timedeal/TimeDealCountdown'

interface ProductsTimeDealHeroProps {
  title: string
  description: string | null
  endTime: string | null
}

export default function ProductsTimeDealHero({ title, description, endTime }: ProductsTimeDealHeroProps) {
  return (
    <section className="pt-8 overflow-x-hidden" style={{ backgroundColor: '#EF4444' }}>
      <div className="container mx-auto px-2">
        <div className="mb-8">
          <div className="flex flex-col gap-2 mb-3 w-[95%] mx-auto">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
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
                    letterSpacing: '1.5px',
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

      <div className="bg-white pb-4 -mx-2 px-3 relative z-10">
        {description && (
          <div className="px-3 pt-4 mb-4">
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
      </div>
      <div className="bg-white h-8 -mt-4"></div>
    </section>
  )
}

