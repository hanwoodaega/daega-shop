'use client'

import { formatPrice } from '@/lib/utils/utils'

interface CheckoutBottomBarProps {
  isGiftMode: boolean
  currentStep: number
  totalGiftSteps: number
  isProcessing: boolean
  finalTotal: number
  shipping: number
  onNextStep: (e?: React.MouseEvent) => void
}

export default function CheckoutBottomBar({
  isGiftMode,
  currentStep,
  totalGiftSteps,
  isProcessing,
  finalTotal,
  shipping,
  onNextStep,
}: CheckoutBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[480px] bg-white shadow-lg">
          <div className={isGiftMode ? 'px-4 py-3' : 'px-0 pb-0'}>
            {isGiftMode && currentStep < totalGiftSteps ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNextStep(e)
                }}
                className="w-full text-lg font-bold bg-red-600 text-white hover:bg-red-600 py-3 flex items-center justify-center transition"
              >
                다음
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing}
                className={`w-full text-lg font-bold transition disabled:bg-gray-400 disabled:text-gray-500 flex items-center justify-center gap-2 ${
                  isGiftMode && currentStep === totalGiftSteps
                    ? 'bg-red-600 text-white hover:bg-red-600 py-3'
                    : isGiftMode 
                    ? 'bg-[#FEE500] text-[#000000] hover:bg-[#FDD835] shadow-md rounded-xl py-2.5' 
                    : 'bg-red-600 text-white hover:bg-blue-950 py-3'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${isGiftMode && currentStep === totalGiftSteps ? 'border-white' : isGiftMode ? 'border-[#000000]' : 'border-white'}`}></div>
                    처리 중...
                  </>
                ) : (
                  <>
                    {isGiftMode && currentStep === totalGiftSteps ? (
                      <span>{formatPrice(finalTotal + shipping)}원 결제하기</span>
                    ) : isGiftMode ? (
                      <>
                        <svg 
                          width="52" 
                          height="36" 
                          viewBox="0 0 60 40" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          className="flex-shrink-0"
                        >
                          <ellipse 
                            cx="30" 
                            cy="20" 
                            rx="23" 
                            ry="19" 
                            fill="#3C1E1E"
                          />
                          <text 
                            x="30" 
                            y="21" 
                            textAnchor="middle" 
                            fontSize="13" 
                            fontWeight="600" 
                            fill="#FEE500"
                            fontFamily="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
                            letterSpacing="0.3"
                            dominantBaseline="middle"
                            transform="translate(30, 21) scale(1, 1.3) translate(-30, -21)"
                          >
                            TALK
                          </text>
                        </svg>
                        <span className="font-bold">{formatPrice(finalTotal + shipping)}원 선물하기</span>
                      </>
                    ) : (
                      <span>{formatPrice(finalTotal + shipping)}원 결제하기</span>
                    )}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

