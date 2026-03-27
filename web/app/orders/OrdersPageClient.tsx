'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { useAuth } from '@/lib/auth/auth-context'
import { useOrders } from '@/lib/order'
import OrderHeader from './_components/OrderHeader'
import OrderSkeleton from './_components/OrderSkeleton'
import GiftShareBox from './_components/GiftShareBox'
import OrdersList from './_components/OrdersList'

function OrdersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

  const giftToken = searchParams?.get('giftToken')

  const {
    orders,
    loadingOrders,
    cancelingOrderId,
    confirmingOrderId,
    expandedOrders,
    giftOrder,
    toggleOrderExpand,
    handleCancelOrder,
    handleTrackDelivery,
    handleConfirmPurchase,
  } = useOrders({ userId: user?.id, giftToken })

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
        <h2 className="hidden lg:block text-3xl font-bold text-center mb-8 text-primary-900 lg:mt-10">주문내역</h2>
        {giftToken && (
          <GiftShareBox giftToken={giftToken} giftOrder={giftOrder} />
        )}

        <OrdersList
          orders={orders}
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


