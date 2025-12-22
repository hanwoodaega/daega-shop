'use client'

import { Fragment } from 'react'
import { useRouter } from 'next/navigation'

interface CheckoutHeaderProps {
  isGiftMode: boolean
  currentStep: number
  totalGiftSteps: number
  title?: string
}

export function CheckoutHeader({ 
  isGiftMode, 
  currentStep, 
  totalGiftSteps,
  title 
}: CheckoutHeaderProps) {
  const router = useRouter()
  const displayTitle = title || (isGiftMode ? '선물하기' : '주문/결제')

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
        <button
          onClick={() => {
            if (isGiftMode && currentStep > 1) {
              // This will be handled by parent component
              router.back()
            } else {
              router.back()
            }
          }}
          aria-label="뒤로가기"
          className="p-2 text-gray-700 hover:text-gray-900"
        >
          <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
            {displayTitle}
          </h1>
        </div>

        {isGiftMode && (
          <div className="ml-auto mr-2 flex items-center gap-1.5">
            {[1, 2, 3].map((step, index) => (
              <Fragment key={step}>
                <div
                  className={`w-2 h-2 rounded-full ${
                    step <= currentStep ? 'bg-primary-800' : 'bg-gray-300'
                  }`}
                ></div>
                {index < 2 && (
                  <div
                    className={`w-4 h-0.5 ${
                      currentStep > step ? 'bg-primary-800' : 'bg-gray-300'
                    }`}
                  ></div>
                )}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

