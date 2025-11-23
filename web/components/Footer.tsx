'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const CUSTOMER_SERVICE_BUTTONS = [
  { href: 'tel:010-3941-1223', label: '전화걸기', external: false },
  { href: 'http://pf.kakao.com/_your_channel_id', label: '1:1 카톡', external: true },
]

const FOOTER_LINKS = [
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/finance-terms', label: '전자금융거래약관' },
  { href: '/refund', label: '반품/교환/환불' },
]

const COMPANY_INFO = [
  { value: '(주)대가', bold: true },
  { value: '대표자: 김영락 | 사업자등록번호: 000-00-00000' },
  { value: '통신판매업신고: 제0000-서울-0000호' },
  { value: '개인정보보호책임자: 김다민 | 주소: 전남 순천시 연향상가 7길 7' },
]

export default function Footer() {
  const pathname = usePathname()
  
  return (
    <footer className="mt-10">
      {/* 고객센터 - 진한 네이비 배경 */}
      <div className="bg-blue-950 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">(주)대가 고객센터</h4>
              <div className="flex">
                {CUSTOMER_SERVICE_BUTTONS.map((button, index) => (
                  <a 
                    key={button.href}
                    href={button.href}
                    {...(button.external && { target: '_blank', rel: 'noopener noreferrer' })}
                    className={`px-3 py-1.5 bg-black text-white text-xs font-medium hover:bg-gray-900 transition whitespace-nowrap ${
                      index === 0 ? 'border-r border-gray-700' : ''
                    }`}
                  >
                    {button.label}
                  </a>
                ))}
              </div>
            </div>
            <ul className="space-y-1 text-xs text-gray-300">
              <li>1588-0000/admin@hanwoodaega.com</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 회사 정보 및 약관 - 연한 회색 배경 */}
      <div className="bg-gray-100">
        <div className="container mx-auto px-4 py-8 pb-16">
          <div className="mb-6">
            <ul className="space-y-1 text-xs text-gray-600">
              {COMPANY_INFO.map((info, index) => (
                <li key={index} className={info.bold ? 'font-bold text-gray-900' : ''}>
                  {info.value}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-400 pt-6">
            <div className="flex flex-wrap gap-2 mb-4" style={{ fontSize: '11px' }}>
              {FOOTER_LINKS.map((link, index) => (
                <div key={link.href} className="flex items-center gap-2">
                  <Link 
                    href={link.href}
                    className={`font-bold transition ${
                      pathname === link.href ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                  {index < FOOTER_LINKS.length - 1 && (
                    <span className="text-gray-400">|</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-4">
              &copy; (주)대가. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

