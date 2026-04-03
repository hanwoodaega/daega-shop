'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { useAuth } from '@/lib/auth/auth-context'
import { useOrders } from '@/lib/order'
import OrderHeader from './_components/OrderHeader'
import OrderSkeleton from './_components/OrderSkeleton'
import OrdersList from './_components/OrdersList'

function OrdersPageContent() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [productKeyword, setProductKeyword] = useState('')

  const {
    orders,
    loadingOrders,
    cancelingOrderId,
    confirmingOrderId,
    expandedOrders,
    orderPeriodMonths,
    setOrderPeriodMonths,
    toggleOrderExpand,
    handleCancelOrder,
    handleTrackDelivery,
    handleConfirmPurchase,
  } = useOrders({ userId: user?.id })

  const filteredOrders = useMemo(() => {
    const keyword = productKeyword.trim().toLowerCase()
    if (!keyword) return orders
    return orders.filter((order) =>
      (order.order_items || []).some((item) =>
        (item.product?.name || '').toLowerCase().includes(keyword)
      )
    )
  }, [orders, productKeyword])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="lg:hidden">
          <OrderHeader />
        </div>
        <div className="hidden lg:block">
          <Header showCartButton />
        </div>
        <main className="flex-1 container mx-auto max-w-4xl px-4 py-6 pb-24 lg:pb-6">
          <h2 className="hidden lg:block text-3xl font-bold text-center mb-8 text-primary-900 lg:mt-10">주문내역</h2>
          <OrderSkeleton />
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 모바일: 주문내역 전용 헤더 */}
      <div className="lg:hidden">
        <OrderHeader />
      </div>
      {/* PC: 메인 헤더 + 메인메뉴 */}
      <div className="hidden lg:block">
        <Header showCartButton />
      </div>

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-6 pb-24 lg:pb-6">
        <div className="lg:hidden mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={orderPeriodMonths}
              onChange={(e) => setOrderPeriodMonths(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={1}>1개월</option>
              <option value={3}>3개월</option>
              <option value={6}>6개월</option>
              <option value={12}>1년</option>
            </select>
            <div className="flex-1 min-w-[180px] relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="search"
                value={productKeyword}
                onChange={(e) => setProductKeyword(e.target.value)}
                placeholder="상품명 검색"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
        <div className="hidden lg:block bg-white rounded-lg border border-gray-200 p-5 pb-4 mb-4">
          <h2 className="text-2xl font-bold text-primary-900 mb-4 text-center">주문 내역</h2>
          <div className="border-t border-gray-200 pt-4 flex flex-wrap items-center gap-3">
            <select
              value={orderPeriodMonths}
              onChange={(e) => setOrderPeriodMonths(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={1}>1개월</option>
              <option value={3}>3개월</option>
              <option value={6}>6개월</option>
              <option value={12}>1년</option>
            </select>
            <div className="flex-1 min-w-[200px] relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="search"
                value={productKeyword}
                onChange={(e) => setProductKeyword(e.target.value)}
                placeholder="상품명으로 검색해보세요"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
        <OrdersList
          orders={filteredOrders}
          loadingOrders={loadingOrders}
          expandedOrders={expandedOrders}
          cancelingOrderId={cancelingOrderId}
          confirmingOrderId={confirmingOrderId}
          onToggleExpand={toggleOrderExpand}
          onCancelOrder={handleCancelOrder}
          onConfirmPurchase={handleConfirmPurchase}
          onTrackDelivery={handleTrackDelivery}
        />
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

export default function OrdersPageClientWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-white">
        <div className="lg:hidden">
          <OrderHeader />
        </div>
        <div className="hidden lg:block">
          <Header showCartButton />
        </div>
        <main className="flex-1 container mx-auto max-w-4xl px-4 py-6 pb-24 lg:pb-6">
          <h2 className="hidden lg:block text-3xl font-bold text-center mb-8 text-primary-900 lg:mt-10">주문내역</h2>
          <OrderSkeleton />
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  )
}


