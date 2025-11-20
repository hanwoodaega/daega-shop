'use client'

import { useRouter } from 'next/navigation'

type AdminCard = {
  title: string
  description: string
  href: string
  accent: string
  badge?: string
}

const managementCards: AdminCard[] = [
  {
    title: '상품 관리',
    description: '상품 등록, 품절 전환, 태그 관리까지 한 곳에서.',
    href: '/admin/products',
    accent: 'bg-primary-100 text-primary-800',
    badge: 'NEW',
  },
  {
    title: '프로모션 (1+1, 2+1)',
    description: '묶음/증정 프로모션을 생성하고 실시간으로 관리하세요.',
    href: '/admin/promotions',
    accent: 'bg-fuchsia-100 text-fuchsia-700',
  },
  {
    title: '할인 관리',
    description: '상시 할인, 타임딜, 쿠폰 정책을 구성하고 성과를 확인해요.',
    href: '/admin/discounts',
    accent: 'bg-amber-100 text-amber-700',
  },
  {
    title: '타임딜 관리',
    description: '한정 재고, 초특가 프로모션을 빠르게 세팅하세요.',
    href: '/admin/flash-sales',
    accent: 'bg-orange-100 text-orange-700',
  },
  {
    title: '주문 관리',
    description: '주문 상태 변경, 리뷰 모니터링, 고객 응대까지 한번에.',
    href: '/admin/orders',
    accent: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: '알림',
    description: '적립 정책, 알림 발송을 유연하게 설정합니다.',
    href: '/admin/notifications',
    accent: 'bg-indigo-100 text-indigo-700',
  },
  {
    title: '선물관 관리',
    description: '선물 대상별 상품을 설정하고 관리하세요.',
    href: '/admin/gift-management',
    accent: 'bg-pink-100 text-pink-700',
  },
]

const supportCards: AdminCard[] = [
  {
    title: '쿠폰 관리',
    description: '카테고리/기간별 쿠폰 전략을 설계하세요.',
    href: '/admin/coupons',
    accent: 'bg-purple-100 text-purple-700',
  },
  {
    title: '리뷰 관리',
    description: '리뷰 모더레이션, 답변, 노출 설정을 제어합니다.',
    href: '/admin/reviews',
    accent: 'bg-rose-100 text-rose-700',
  },
]

const insightItems = [
  { label: '오늘 신규 주문', value: '42건', trend: '+18% vs. 어제' },
  { label: '대기 중 CS 티켓', value: '3건', trend: '빠른 응답 필요' },
  { label: '활성 프로모션', value: '6건', trend: '상품 관리에서 확인' },
]

export default function AdminPage() {
  const router = useRouter()
  
  const handleNavigate = (href: string) => {
    router.push(href)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="text-sm text-neutral-500">DAEGA Admin</p>
              <h1 className="text-3xl font-semibold tracking-tight">운영 대시보드</h1>
              <p className="text-neutral-500 text-sm">상품, 주문, 혜택 관리를 빠르게 시작하세요.</p>
            </div>
            <div className="flex flex-wrap gap-3">
            <button 
                onClick={() => handleNavigate('/admin/products')}
                className="px-5 py-2.5 rounded-full bg-primary-800 text-white text-sm font-semibold hover:bg-primary-900 transition"
            >
                상품 관리 바로가기
            </button>
          </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insightItems.map((item) => (
              <div
                key={item.label}
                className="bg-neutral-900 text-white rounded-2xl p-5 space-y-2 shadow-sm"
              >
                <p className="text-sm text-neutral-300">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className="text-xs text-neutral-400">{item.trend}</p>
          </div>
            ))}
          </div>
          </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
          <div>
              <p className="text-sm text-neutral-500">Operations</p>
              <h2 className="text-xl font-semibold">핵심 업무</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {managementCards.map((card) => (
              <div key={card.title} className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
          <div>
                    <div className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${card.accent}`}>
                      {card.title}
                      {card.badge && (
                        <span className="ml-2 bg-white/80 text-[10px] font-bold px-2 py-0.5 rounded-full text-neutral-700">
                          {card.badge}
                        </span>
                      )}
          </div>
                    <p className="mt-3 text-sm text-neutral-600">{card.description}</p>
          </div>
          </div>
                <button
                  onClick={() => handleNavigate(card.href)}
                  className="mt-2 inline-flex items-center text-sm font-semibold text-primary-800 hover:text-primary-900"
                >
                  바로가기 →
                </button>
          </div>
            ))}
            </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Customer & Promotion</p>
              <h2 className="text-xl font-semibold">고객 / 혜택 / 콘텐츠</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {supportCards.map((card) => (
              <div key={card.title} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${card.accent}`}>
                  {card.title}
        </div>
                <p className="text-sm text-neutral-600">{card.description}</p>
                <button
                  onClick={() => handleNavigate(card.href)}
                  className="text-sm font-semibold text-neutral-700 hover:text-neutral-900"
                >
                  열기 →
                </button>
              </div>
                            ))}
                          </div>
        </section>

        <section className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <p className="text-sm text-neutral-500">Guides</p>
            <h2 className="text-xl font-semibold">이번 주 체크리스트</h2>
                        </div>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li>• 추석 기획전 상품을 상품 관리 &gt; 기획전 태그로 묶어주세요.</li>
            <li>• 인기 한우 세트 재고를 확인하고, 품절 상품은 대체 상품을 등록합니다.</li>
            <li>• 리뷰 관리에서 신고 리뷰 2건을 확인하고 답변을 남겨주세요.</li>
          </ul>
          <div className="flex flex-wrap gap-3">
                        <button 
              onClick={() => handleNavigate('/admin/products')}
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
            >
              상품 관리 열기
                        </button>
                        <button 
              onClick={() => handleNavigate('/admin/support')}
              className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              운영 가이드 보기
                        </button>
          </div>
        </section>

        <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-neutral-200 bg-white rounded-2xl p-6 shadow-sm">
          <div>
            <p className="text-sm text-neutral-500">Support</p>
            <h3 className="text-lg font-semibold">운영팀이 필요하신가요?</h3>
            <p className="text-sm text-neutral-600 mt-1">Slack #daega-admin 또는 ops@daega.com 으로 문의해주세요.</p>
                </div>
                <button
            onClick={() => handleNavigate('/admin/support')}
            className="px-5 py-2.5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
          >
            운영 지원 요청
                </button>
        </section>
      </main>
    </div>
  )
}

