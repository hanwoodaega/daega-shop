'use client'

import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'

export default function SupportPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        <div className="flex items-center mb-4">
          <button
            onClick={() => router.back()}
            className="mr-3 p-1 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">고객센터</h1>
        </div>

        <div className="space-y-4">
          {/* 고객센터 연락처 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              고객센터 연락처
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-900 font-medium">전화: 1234-5678</p>
              <p className="text-gray-600">운영시간: 평일 09:00 ~ 18:00</p>
              <p className="text-gray-600">(주말 및 공휴일 휴무)</p>
            </div>
          </div>

          {/* 자주 묻는 질문 */}
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
                  <p className="mb-2">• <strong>택배배송:</strong> 주문 후 2~3일 소요 (영업일 기준)</p>
                  <p className="mb-2">• <strong>퀵배달:</strong> 1~2시간 내 신속 배달 (연향동, 조례동, 풍덕동, 해룡면)</p>
                  <p>• <strong>매장 픽업:</strong> 당일 픽업 가능 (오전 10시 ~ 오후 8시)</p>
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
                  <p>• 환불은 영업일 기준 3~5일 소요됩니다.</p>
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
                  <p className="mb-2">전라남도 순천시 해룡면 대가 정육백화점</p>
                  <p className="mb-2"><strong>픽업 가능 시간:</strong></p>
                  <p className="mb-2">오전 10:00 ~ 오후 8:00 (매일)</p>
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
                  <p className="mb-2"><strong>배달 시간:</strong> 오전 10시 ~ 오후 10시</p>
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

              {/* 할인 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">할인 상품은 언제 나오나요?</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">할인 상품은 수시로 업데이트됩니다:</p>
                  <p className="mb-2">• 매주 금요일 특가 상품 공개</p>
                  <p className="mb-2">• 명절 전후 할인 이벤트</p>
                  <p>• 홈페이지에서 할인율이 표시된 상품을 확인하세요!</p>
                </div>
              </details>

              {/* 재고 */}
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-medium text-gray-900">품절된 상품은 언제 재입고되나요?</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-2">품절 상품은 보통 2~3일 내 재입고됩니다.</p>
                  <p className="mb-2">재입고 알림을 원하시면 고객센터로 문의해주세요.</p>
                  <p>• 전화: 1234-5678</p>
                </div>
              </details>
            </div>
          </div>

          {/* 매장 정보 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              매장 정보
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-900 font-medium">대가 정육백화점</p>
              <p className="text-gray-600">주소: 전라남도 순천시 해룡면</p>
              <p className="text-gray-600">영업시간: 매일 10:00 ~ 20:00</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

