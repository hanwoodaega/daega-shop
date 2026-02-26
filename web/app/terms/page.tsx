'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'

export default function TermsPage() {
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
          <h1 className="text-lg font-semibold">이용약관</h1>
        </button>
        
        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">제1조 (목적)</h2>
            <p className="text-gray-700 leading-relaxed">
              본 약관은 (주)한우대가(이하 "회사")가 운영하는 온라인 쇼핑몰에서 제공하는 
              전자상거래 관련 서비스(이하 "서비스")를 이용함에 있어 회사와 이용자의 권리, 의무 
              및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제2조 (정의)</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>"회사"라 함은 (주)한우대가를 운영하는 사업자를 말합니다.</li>
              <li>"이용자"라 함은 회사의 서비스에 접속하여 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
              <li>"회원"이라 함은 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며, 회사가 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
              <li>"비회원"이라 함은 회원에 가입하지 않고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제3조 (약관의 명시와 개정)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ① 회사는 이 약관의 내용과 상호, 영업소 소재지, 대표자의 성명, 사업자등록번호, 
              통신판매업신고번호, 연락처(전화, 팩스, 전자우편 주소 등) 등을 이용자가 알 수 있도록 
              초기 서비스화면에 게시합니다.
            </p>
            <p className="text-gray-700 leading-relaxed">
              ② 회사는 약관의규제등에관한법률, 전자거래기본법, 전자서명법, 정보통신망이용촉진등에관한법률, 
              소비자보호법 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제4조 (서비스의 제공 및 변경)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ① 회사는 다음과 같은 업무를 수행합니다:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>재화 또는 용역에 대한 정보 제공 및 구매계약의 체결</li>
              <li>구매계약이 체결된 재화 또는 용역의 배송</li>
              <li>기타 회사가 정하는 업무</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제5조 (서비스의 중단)</h2>
            <p className="text-gray-700 leading-relaxed">
              ① 회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 
              경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">제6조 (회원가입)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ① 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 
              의사표시를 함으로서 회원가입을 신청합니다.
            </p>
            <p className="text-gray-700 leading-relaxed">
              ② 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각호에 해당하지 
              않는 한 회원으로 등록합니다.
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



