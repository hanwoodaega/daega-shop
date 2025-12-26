'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
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
      router.push('/auth/login?next=/orders')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <OrderHeader />
        <main className="flex-1 container mx-auto px-4 py-4 pb-24">
          <OrderSkeleton />
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <OrderHeader />
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
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
      <div className="min-h-screen flex flex-col bg-gray-50">
        <OrderHeader />
        <main className="flex-1 container mx-auto px-4 py-4 pb-24">
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


