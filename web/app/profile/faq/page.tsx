'use client'

import { useRouter } from 'next/navigation'

export default function ProfileFAQPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* PC 전용: DOM 순서상 먼저 배치해 PC에서 모바일 UI 플래시 방지 */}
      <div className="hidden lg:block flex-1 w-full">
        <div className="container mx-auto px-4 py-6 pb-6 max-w-none">
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4 shadow-sm">
            <h2 className="text-2xl font-bold text-primary-900 text-center">자주 묻는 질문</h2>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="border-b border-gray-200 pb-4 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">자주 묻는 질문</h3>
            </div>

            <div className="space-y-4">
              {/* 배송 관련 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">배송은 얼마나 걸리나요?</span>
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">
                    • <strong>택배배송:</strong> 주문 후 1~2일 소요 (영업일 기준)
                  </p>
                  <p>
                    • <strong>매장 픽업:</strong> 당일 픽업 가능 (오전 9시 ~ 오후 9시)
                  </p>
                </div>
              </details>

              {/* 무료 배송 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">무료 배송 기준이 어떻게 되나요?</span>
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">
                    택배배송은 <strong>5만원 이상</strong> 구매 시 무료입니다.
                  </p>
                  <p className="mb-2">• 5만원 미만: 배송비 3,000원</p>
                  <p>• 매장 픽업: 무료</p>
                </div>
              </details>

              {/* 교환/환불 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">교환/환불은 어떻게 하나요?</span>
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">
                    <strong>교환/환불 가능 기간:</strong>
                  </p>
                  <p className="mb-2">
                    • 신선식품 특성상 <strong>수령 당일</strong>에만 가능합니다.
                  </p>
                  <p className="mb-2">• 제품 하자가 있는 경우 즉시 사진과 함께 고객센터로 연락해주세요.</p>
                  <p className="mb-2">
                    <strong>환불 처리:</strong>
                  </p>
                  <p className="mb-2">
                    • MY {'->'} 주문내역 {'->'} 결제완료 상태에서 &quot;주문취소&quot; 클릭
                  </p>
                  <p>• 환불은 영업일 기준 3~5일이 소요될 수 있습니다.</p>
                </div>
              </details>

              {/* 매장 픽업 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">매장 픽업은 어디서 받을 수 있나요?</span>
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">
                    <strong>매장 위치:</strong>
                  </p>
                  <p className="mb-2">전라남도 순천시 해룡면 상성길 183 대가정육마트</p>
                  <p className="mb-2">
                    <strong>픽업 가능 시간:</strong>
                  </p>
                  <p className="mb-2">오전 9:00 ~ 오후 9:00 (매일)</p>
                  <p className="mb-2">
                    <strong>픽업 방법:</strong>
                  </p>
                  <p>주문 시 선택한 시간에 방문하여 주문자 이름으로 찾아주시면 됩니다.</p>
                </div>
              </details>

              {/* 상품 보관 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">정육은 어떻게 보관해야 하나요?</span>
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">
                    <strong>냉장 보관:</strong>
                  </p>
                  <p className="mb-2">• 수령 즉시 냉장고(0~4℃)에 보관</p>
                  <p className="mb-2">• 냉장 보관 시 2~3일 내 소비 권장</p>
                  <p className="mb-2">
                    <strong>냉동 보관:</strong>
                  </p>
                  <p className="mb-2">• 장기 보관 시 냉동(-18℃ 이하) 권장</p>
                  <p className="mb-2">• 냉동 보관 시 1~2개월 보관 가능</p>
                  <p>• 해동 후 재냉동은 피해주세요.</p>
                </div>
              </details>

              {/* 결제 방법 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">어떤 결제 수단을 사용할 수 있나요?</span>
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">
                    <strong>한우:</strong>
                  </p>
                  <p className="mb-2">• 국내산 한우 (1++, 1+, 1등급)</p>
                  <p className="mb-2">• 육질이 부드럽고 마블링이 우수</p>
                  <p className="mb-2">
                    <strong>수입육:</strong>
                  </p>
                  <p className="mb-2">• 미국산, 호주산 등</p>
                  <p className="mb-2">• 합리적인 가격</p>
                  <p>모든 상품 페이지에서 원산지를 확인할 수 있습니다.</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 전용 헤더 */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
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
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 pb-24 lg:py-6 lg:pb-6 lg:max-w-none">
        <div className="lg:hidden">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              자주 묻는 질문
            </h2>
            <div className="space-y-4">
              {/* 동일한 FAQ 항목들 (모바일에서도 재사용) */}
              {/* 배송 관련 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">배송은 얼마나 걸리나요?</span>
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">
                    • <strong>택배배송:</strong> 주문 후 1~2일 소요 (영업일 기준)
                  </p>
                  <p>
                    • <strong>매장 픽업:</strong> 당일 픽업 가능 (오전 9시 ~ 오후 9시)
                  </p>
                </div>
              </details>

              {/* 이하 FAQ 항목들은 PC와 동일하게 반복 */}
              {/* 무료 배송 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">무료 배송 기준이 어떻게 되나요?</span>
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">
                    택배배송은 <strong>5만원 이상</strong> 구매 시 무료입니다.
                  </p>
                  <p className="mb-2">• 5만원 미만: 배송비 3,000원</p>
                  <p>• 매장 픽업: 무료</p>
                </div>
              </details>

              {/* 나머지 항목들도 위의 PC 영역과 동일하게 추가 가능 */}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

