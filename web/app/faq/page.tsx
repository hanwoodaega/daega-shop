'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { useCartStore } from '@/lib/store'

export default function FAQPage() {
  const router = useRouter()
  const cartCount = useCartStore((state) => state.getTotalItems())

  // PC는 /profile/faq 사용 → 이 페이지는 모바일 전용
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(min-width: 1024px)').matches) {
      router.replace('/profile/faq')
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 모바일 전용 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">자주 묻는 질문</h1>
          </div>
          <div className="ml-auto flex items-center">
            <button
              onClick={() => router.push('/cart')}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span
                className={`absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
                  cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                }`}
                suppressHydrationWarning
                aria-hidden={cartCount <= 0}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            {/* 배송 관련 */}
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="font-medium text-gray-900">배송은 얼마나 걸리나요?</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                <p className="mb-2">• <strong>택배배송:</strong> 주문 후 1~2일 소요 (영업일 기준)</p>
                <p className="mb-2">• <strong>퀵배달:</strong> 선택한 시간대 내 신속 배달 (연향동, 조례동, 풍덕동, 해룡면)</p>
                <p>• <strong>매장 픽업:</strong> 당일 픽업 가능 (오전 9시 ~ 오후 9시)</p>
              </div>
            </details>

            {/* 무료 배송 */}
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="font-medium text-gray-900">무료 배송 기준이 어떻게 되나요?</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                <p className="mb-2">택배배송은 <strong>5만원 이상</strong> 구매 시 무료입니다.</p>
                <p className="mb-2">• 5만원 미만: 배송비 3,000원</p>
                <p className="mb-2">• 퀵배달: 항상 5,000원</p>
                <p>• 매장 픽업: 무료</p>
              </div>
            </details>

            {/* 교환/환불 */}
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="font-medium text-gray-900">교환/환불은 어떻게 하나요?</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                <p className="mb-2"><strong>교환/환불 가능 기간:</strong></p>
                <p className="mb-2">• 신선식품 특성상 <strong>수령 당일</strong>에만 가능합니다.</p>
                <p className="mb-2">• 제품 하자가 있는 경우 즉시 사진과 함께 고객센터로 연락해주세요.</p>
                <p className="mb-2"><strong>환불 처리:</strong></p>
                <p className="mb-2">• MY {'->'} 주문내역 {'->'} 결제완료 상태에서 &quot;주문취소&quot; 클릭</p>
                <p>• 환불은 영업일 기준 3~5일이 소요될 수 있습니다.</p>
              </div>
            </details>

            {/* 매장 픽업 */}
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="font-medium text-gray-900">매장 픽업은 어디서 받을 수 있나요?</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                <p className="mb-2"><strong>매장 위치:</strong></p>
                <p className="mb-2">전라남도 순천시 해룡면 상성길 183 대가정육마트</p>
                <p className="mb-2"><strong>픽업 가능 시간:</strong></p>
                <p className="mb-2">오전 9:00 ~ 오후 9:00 (매일)</p>
                <p className="mb-2"><strong>픽업 방법:</strong></p>
                <p>주문 시 선택한 시간에 방문하여 주문자 이름으로 찾아주시면 됩니다.</p>
              </div>
            </details>

            {/* 상품 보관 */}
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="font-medium text-gray-900">정육은 어떻게 보관해야 하나요?</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                <p className="mb-2"><strong>냉장 보관:</strong></p>
                <p className="mb-2">• 수령 즉시 냉장고(0~4℃)에 보관</p>
                <p className="mb-2">• 냉장 보관 시 2~3일 내 소비 권장</p>
                <p className="mb-2"><strong>냉동 보관:</strong></p>
                <p className="mb-2">• 장기 보관 시 냉동(-18℃ 이하) 권장</p>
                <p className="mb-2">• 냉동 보관 시 1~2개월 보관 가능</p>
                <p>• 해동 후 재냉동은 피해주세요.</p>
              </div>
            </details>

            {/* 퀵배달 */}
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="font-medium text-gray-900">퀵배달 가능 지역은 어디인가요?</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                <p className="mb-2"><strong>현재 퀵배달 가능 지역:</strong></p>
                <p className="mb-2">• 연향동</p>
                <p className="mb-2">• 조례동</p>
                <p className="mb-2">• 풍덕동</p>
                <p className="mb-2">• 해룡면</p>
                <p className="mb-2"><strong>배달 시간:</strong> 오후 3시 ~ 오후 5시</p>
                <p><strong>배달비:</strong> 5,000원 (고정)</p>
              </div>
            </details>

            {/* 결제 방법 */}
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="font-medium text-gray-900">어떤 결제 수단을 사용할 수 있나요?</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                <p className="mb-2">다음 결제 수단을 지원합니다:</p>
                <p className="mb-2">• 신용카드 (국내 모든 카드)</p>
                <p className="mb-2">• 계좌이체</p>
                <p className="mb-2">• 카카오페이</p>
                <p>• 토스페이</p>
              </div>
            </details>

            {/* 원산지 */}
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="font-medium text-gray-900">한우와 수입육의 차이가 무엇인가요?</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                <p className="mb-2"><strong>한우:</strong></p>
                <p className="mb-2">• 국내산 한우 (1++, 1+, 1등급)</p>
                <p className="mb-2">• 육질이 부드럽고 마블링이 우수</p>
                <p className="mb-2"><strong>수입육:</strong></p>
                <p className="mb-2">• 미국산, 호주산 등</p>
                <p className="mb-2">• 합리적인 가격</p>
                <p>모든 상품 페이지에서 원산지를 확인할 수 있습니다.</p>
              </div>
            </details>
          
          </div>
        </div>
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}


