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
    title: '프로모션 관리',
    description: '할인율 할인, 1+1, 2+1, 3+1 프로모션을 생성하고 관리하세요.',
    href: '/admin/promotions',
    accent: 'bg-fuchsia-100 text-fuchsia-700',
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
  {
    title: '컬렉션 관리',
    description: '베스트, 특가, 한우대가No.9 등 컬렉션을 관리하세요.',
    href: '/admin/collections',
    accent: 'bg-teal-100 text-teal-700',
  },
  {
    title: '상품고시정보',
    description: '상품별 법정 상품 정보 제공 고시를 등록·수정합니다.',
    href: '/admin/product-notice',
    accent: 'bg-amber-100 text-amber-700',
  },
  {
    title: '상품 상세',
    description: '상품별 상세페이지 설명 이미지를 등록·순서 변경·삭제합니다.',
    href: '/admin/product-description',
    accent: 'bg-amber-100 text-amber-700',
  },
  {
    title: '히어로 이미지 관리',
    description: '메인페이지 히어로 섹션 이미지를 관리하세요.',
    href: '/admin/hero',
    accent: 'bg-cyan-100 text-cyan-700',
  },
  {
    title: '배너 관리',
    description: '컬렉션 아래 표시되는 배너를 관리하세요.',
    href: '/admin/banners',
    accent: 'bg-yellow-100 text-yellow-700',
  },
  {
    title: '맞춤별 추천 관리',
    description: '메인페이지 맞춤별 추천 카테고리와 상품을 관리하세요.',
    href: '/admin/recommendations',
    accent: 'bg-green-100 text-green-700',
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
  {
    title: '포인트 관리',
    description: '고객 지정 포인트 적립 및 관리',
    href: '/admin/points',
    accent: 'bg-blue-100 text-blue-700',
  },
]

// 주문 통계를 가져오는 함수 (실제 데이터는 주문 관리 페이지에서 확인)
const getTodayOrdersUrl = () => {
  const today = new Date().toISOString().split('T')[0]
  return `/admin/orders?date=${today}`
}

const getRecent14DaysOrdersUrl = () => {
  const today = new Date()
  const fourteenDaysAgo = new Date(today)
  fourteenDaysAgo.setDate(today.getDate() - 14)
  const startDate = fourteenDaysAgo.toISOString().split('T')[0]
  const endDate = today.toISOString().split('T')[0]
  return `/admin/orders?start_date=${startDate}&end_date=${endDate}`
}

interface AdminDashboardClientProps {
  todayOrdersCount: number
  recent14DaysOrdersCount: number
}

export default function AdminDashboardClient({ 
  todayOrdersCount, 
  recent14DaysOrdersCount 
}: AdminDashboardClientProps) {
  const router = useRouter()

  const handleNavigate = (href: string) => {
    router.push(href)
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleNavigate(getTodayOrdersUrl())}
              className="bg-neutral-900 text-white rounded-2xl p-5 space-y-2 shadow-sm hover:bg-neutral-800 transition text-left"
            >
              <p className="text-sm text-neutral-300">오늘 신규 주문</p>
              <p className="text-2xl font-semibold">
                {todayOrdersCount}건
              </p>
              <p className="text-xs text-neutral-400">오늘 주문 내역 보기 →</p>
            </button>
            <button
              onClick={() => handleNavigate(getRecent14DaysOrdersUrl())}
              className="bg-neutral-900 text-white rounded-2xl p-5 space-y-2 shadow-sm hover:bg-neutral-800 transition text-left"
            >
              <p className="text-sm text-neutral-300">최근 14일 주문</p>
              <p className="text-2xl font-semibold">
                {recent14DaysOrdersCount}건
              </p>
              <p className="text-xs text-neutral-400">최근 14일 주문 내역 보기 →</p>
            </button>
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

