'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'

export default function RefundPage() {
  const router = useRouter()
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header hideMainMenu />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-4xl">
        {/* 페이지 제목 */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-gray-700 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <h1 className="text-lg font-semibold">반품/교환/환불 정책</h1>
        </button>
        
        <div className="prose prose-slate max-w-none space-y-8">
          <section className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <p className="text-gray-700 leading-relaxed">
              (주)한우대가는 신선식품의 특성상 상품 수령 후 즉시 확인하시어 문제가 있을 경우 
              빠른 시일 내에 연락 주시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. 반품/교환이 가능한 경우</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>상품이 배송 중 파손되어 수령한 경우</li>
              <li>주문한 상품과 다른 상품이 배송된 경우</li>
              <li>상품의 내용이 표시·광고의 내용과 다르거나 현저한 차이가 있는 경우</li>
              <li>신선도에 문제가 있는 경우 (부패, 변질 등)</li>
            </ul>
            <div className="bg-yellow-50 p-4 rounded-lg mt-4">
              <p className="text-sm text-gray-700">
                <strong>⚠️ 중요:</strong> 상품 수령 후 24시간 이내에 사진과 함께 고객센터(061-724-1223)로 
                연락 주시기 바랍니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. 반품/교환이 불가능한 경우</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>이용자의 책임 있는 사유로 상품이 멸실 또는 훼손된 경우</li>
              <li>포장을 개봉하였거나 포장이 훼손되어 상품가치가 상실된 경우</li>
              <li>이용자의 사용 또는 일부 소비에 의하여 상품의 가치가 현저히 감소한 경우</li>
              <li>시간의 경과에 의하여 재판매가 곤란할 정도로 상품의 가치가 현저히 감소한 경우</li>
              <li>신선식품의 특성상 냉장/냉동 보관 미흡으로 인한 상품 변질의 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. 반품/교환 절차</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-800 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">고객센터 연락</h3>
                  <p className="text-gray-700 text-sm">
                    상품 수령 후 24시간 이내 고객센터(061-724-1223) 또는 이메일(ekals010829@naver.com)로 
                    연락하여 반품/교환 의사를 전달합니다.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-800 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">상품 확인</h3>
                  <p className="text-gray-700 text-sm">
                    상품 상태 확인을 위해 사진을 요청할 수 있으며, 확인 후 반품/교환 승인 여부를 
                    알려드립니다.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-800 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">상품 회수 또는 교환 배송</h3>
                  <p className="text-gray-700 text-sm">
                    회사 책임인 경우 무료로 회수하며, 교환 상품을 재배송해 드립니다.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-800 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-1">환불 처리</h3>
                  <p className="text-gray-700 text-sm">
                    반품 상품 회수 확인 후 3~5영업일 내에 결제 수단으로 환불됩니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. 환불 안내</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-2 text-gray-700">
                <li><strong>신용카드 결제:</strong> 카드사 승인 취소 후 3~5영업일 내 환불</li>
                <li><strong>실시간 계좌이체:</strong> 3~5영업일 내 환불 계좌로 입금</li>
                <li><strong>가상계좌 입금:</strong> 3~5영업일 내 환불 계좌로 입금</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              * 카드사 사정에 따라 환불 기간이 다소 지연될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. 배송비 부담</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">회사 책임</h3>
                <p className="text-sm text-gray-700 mb-2">다음의 경우 회사가 배송비를 부담합니다:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>상품 파손/오배송</li>
                  <li>상품 불량</li>
                  <li>표시광고와 상이</li>
                </ul>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">고객 책임</h3>
                <p className="text-sm text-gray-700 mb-2">다음의 경우 고객이 배송비를 부담합니다:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>단순 변심</li>
                  <li>고객 과실로 인한 훼손</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. 신선식품 특별 안내</h2>
            <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500">
              <p className="text-gray-700 leading-relaxed mb-3">
                정육은 신선식품으로 배송 후 즉시 냉장/냉동 보관하셔야 합니다. 
                수령 후 상온에 방치하여 상품이 변질된 경우 반품/교환이 불가능합니다.
              </p>
              <p className="text-sm text-gray-700">
                <strong>보관 방법:</strong><br />
                • 냉장육: 수령 즉시 냉장고(0~5℃) 보관<br />
                • 냉동육: 수령 즉시 냉동고(-18℃ 이하) 보관
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. 고객센터 안내</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <ul className="space-y-2 text-gray-700">
                <li><strong>전화:</strong> 061-724-1223</li>
                <li><strong>이메일:</strong> ekals010829@naver.com</li>
                <li><strong>운영시간:</strong> 매일 09:00 - 18:00</li>
              </ul>
            </div>
          </section>

          <section className="bg-gray-50 p-6 rounded-lg">
            <p className="text-sm text-gray-600">
              본 정책은 2026년 4월 1일부터 시행됩니다.
            </p>
          </section>
        </div>
      </main>
      
      <BottomNavbar />
      <Footer />
    </div>
  )
}



