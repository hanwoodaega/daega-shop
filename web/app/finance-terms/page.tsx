'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'

export default function FinanceTermsPage() {
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
          <h1 className="text-lg font-semibold">전자금융거래 이용약관</h1>
        </button>
        
        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">제1조 (목적)</h2>
            <p className="text-gray-700 leading-relaxed">
              본 약관은 (주)한우대가(이하 "회사")가 제공하는 전자지급결제대행서비스 및 
              결제대금예치서비스를 이용자가 이용함에 있어 회사와 이용자 사이의 전자금융거래에 
              관한 기본적인 사항을 정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제2조 (용어의 정의)</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>"전자금융거래"라 함은 회사가 전자적 장치를 통하여 전자금융업무를 제공하고, 
              이용자가 회사의 종사자와 직접 대면하거나 의사소통을 하지 아니하고 자동화된 방식으로 
              이를 이용하는 거래를 말합니다.</li>
              <li>"전자지급수단"이라 함은 전자금융거래법 제2조 제11호에서 정하는 전자화폐, 
              신용카드 등을 말합니다.</li>
              <li>"전자지급거래"라 함은 자금을 주는 자가 회사로 하여금 전자지급수단을 이용하여 
              자금을 받는 자에게 자금을 이동하게 하는 전자금융거래를 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제3조 (약관의 명시 및 변경)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ① 회사는 이용자가 전자금융거래를 하기 전에 본 약관을 게시하고 이용자가 본 약관의 
              중요한 내용을 확인할 수 있도록 합니다.
            </p>
            <p className="text-gray-700 leading-relaxed">
              ② 회사는 관련 법령에 위배하지 않는 범위 내에서 본 약관을 변경할 수 있으며, 
              변경된 약관은 시행일 최소 7일 전에 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제4조 (접근매체의 관리)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ① 회사는 전자금융거래 시 접근매체를 선정하여 이용자의 신원, 권한 및 거래지시의 
              내용 등을 확인합니다.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              ② 이용자는 접근매체를 제3자에게 대여하거나 사용을 위임하거나 양도 또는 담보 
              목적으로 제공할 수 없습니다.
            </p>
            <p className="text-gray-700 leading-relaxed">
              ③ 이용자는 자신의 접근매체를 제3자에게 누설 또는 노출하거나 방치하여서는 안되며, 
              접근매체의 도용이나 위조 또는 변조를 방지하기 위해 충분한 주의를 기울여야 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제5조 (거래내용의 확인)</h2>
            <p className="text-gray-700 leading-relaxed">
              ① 회사는 이용자가 전자금융거래의 내용을 추적, 검색하거나 그 내용에 오류가 있는 
              경우 이를 정정할 수 있는 대책을 수립하여 시행합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제6조 (오류의 정정)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ① 이용자는 전자금융거래에 오류가 있음을 안 때에는 회사에 대하여 그 정정을 요구할 수 있습니다.
            </p>
            <p className="text-gray-700 leading-relaxed">
              ② 회사는 전항의 규정에 따른 오류의 정정요구를 받은 때에는 이를 즉시 조사하여 
              처리한 후 정정요구를 받은 날부터 2주 이내에 그 결과를 이용자에게 알려 드립니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제7조 (회사의 책임)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ① 회사는 접근매체의 위조나 변조로 발생한 사고로 인하여 이용자에게 발생한 손해에 
              대하여 배상책임이 있습니다.
            </p>
            <p className="text-gray-700 leading-relaxed">
              ② 다만, 이용자가 접근매체를 제3자에게 대여하거나 그 사용을 위임한 경우 또는 
              양도나 담보의 목적으로 제공한 경우, 이용자의 고의 또는 중과실로 인하여 제3자가 
              이용자의 접근매체를 이용하여 전자금융거래를 할 수 있음을 알았거나 쉽게 알 수 있었음에도 
              불구하고 이용자가 자신의 접근매체를 누설 또는 노출하거나 방치한 경우 그 책임의 전부 
              또는 일부를 이용자가 부담하게 할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제8조 (분쟁처리 및 분쟁조정)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ① 이용자는 다음의 분쟁처리 책임자 및 담당자에 대하여 전자금융거래와 관련한 
              의견 및 불만의 제기, 손해배상의 청구 등의 분쟁처리를 요구할 수 있습니다.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">분쟁처리 책임자 및 담당자</p>
              <ul className="space-y-1 text-gray-700">
                <li>담당자: 고객지원팀</li>
                <li>연락처: 061-724-1223</li>
                <li>이메일: ekals010829@naver.com</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제9조 (회사의 안정성 확보 의무)</h2>
            <p className="text-gray-700 leading-relaxed">
              회사는 전자금융거래의 안전성과 신뢰성을 확보할 수 있도록 전자금융거래의 종류별로 
              전자적 전송이나 처리를 위한 인력, 시설, 전자적 장치 등의 정보기술부문 및 
              전자금융업무에 관하여 금융감독위원회가 정하는 기준을 준수합니다.
            </p>
          </section>

          <section className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm text-gray-700">
              <strong>금융감독원 전자금융거래 분쟁처리</strong><br />
              전화: 1332 (금융소비자 상담센터)<br />
              홈페이지: www.fcsc.kr
            </p>
          </section>

          <section className="bg-gray-50 p-6 rounded-lg">
            <p className="text-sm text-gray-600">
              본 약관은 2026년 4월 1일부터 시행됩니다.
            </p>
          </section>
        </div>
      </main>
      
      <BottomNavbar />
      <Footer />
    </div>
  )
}



