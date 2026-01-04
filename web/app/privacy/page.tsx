'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'

export default function PrivacyPage() {
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
          <h1 className="text-lg font-semibold">개인정보처리방침</h1>
        </button>
        
        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <p className="text-gray-700 leading-relaxed mb-6">
              (주)대가(이하 "회사")는 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을 
              보호하고 개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 
              처리방침을 두고 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. 개인정보의 수집 항목 및 수집 방법</h2>
            <h3 className="text-lg font-semibold mb-3 mt-4">가. 수집하는 개인정보 항목</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="font-semibold mb-2">회원가입 시</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>필수항목: 이름, 휴대전화번호, 이메일</li>
                <li>선택항목: 생년월일</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">상품 구매 시</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>필수항목: 수령인 정보(이름, 주소, 연락처)</li>
                <li>결제정보: 신용카드 정보, 계좌번호 등</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. 개인정보의 수집 및 이용목적</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인 식별, 불량회원의 부정 이용 방지</li>
              <li>서비스 제공: 물품 배송, 서비스 제공, 청구서 발송, 본인인증, 구매 및 요금 결제</li>
              <li>마케팅 및 광고: 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. 개인정보의 보유 및 이용기간</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              회사는 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 
              단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">상법, 전자상거래법 등 관련 법령에 의한 보존</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>계약 또는 청약철회에 관한 기록: 5년</li>
                <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                <li>표시/광고에 관한 기록: 6개월</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. 개인정보의 제3자 제공</h2>
            <p className="text-gray-700 leading-relaxed">
              회사는 원칙적으로 이용자의 개인정보를 제1조(개인정보의 수집 및 이용목적)에서 
              명시한 범위 내에서 처리하며, 이용자의 사전 동의 없이는 본래의 범위를 초과하여 
              처리하거나 제3자에게 제공하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. 개인정보의 파기절차 및 방법</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>전자적 파일 형태: 복구 및 재생되지 않도록 안전하게 삭제</li>
              <li>종이 문서: 분쇄기로 분쇄하거나 소각</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. 이용자의 권리와 행사방법</h2>
            <p className="text-gray-700 leading-relaxed">
              이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며, 
              가입해지를 요청할 수도 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. 개인정보 보호책임자</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-1 text-gray-700">
                <li>성명: 김다민</li>
                <li>직책: 개인정보보호책임자</li>
                <li>전화번호: 010-3941-1223</li>
                <li>이메일: admin@hanwoodaega.com</li>
              </ul>
            </div>
          </section>

          <section className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>고지의 의무</strong><br />
              현 개인정보처리방침의 내용 추가, 삭제 및 수정이 있을 시에는 시행일자 최소 7일 전부터 
              홈페이지의 '공지사항'을 통해 고지할 것입니다.
            </p>
          </section>

          <section className="bg-gray-50 p-6 rounded-lg">
            <p className="text-sm text-gray-600">
              본 방침은 2025년 12월 1일부터 시행됩니다.
            </p>
          </section>
        </div>
      </main>
      
      <BottomNavbar />
      <Footer />
    </div>
  )
}



