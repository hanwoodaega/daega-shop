'use client'

import { useRouter } from 'next/navigation'
import { useAdminOrders } from './_hooks/useAdminOrders'
import OrderFilters from './_components/OrderFilters'
import OrderStats from './_components/OrderStats'
import OrderList from './_components/OrderList'
import AdminPageLayout from '../_components/AdminPageLayout'

export default function AdminOrdersPage() {
  const router = useRouter()
  const {
    orders,
    loading,
    filters,
    setFilter,
    updatingOrderId,
    processingAutoConfirm,
    trackingInputs,
    setTrackingNumber,
    handleStatusChange,
    handleAutoConfirm,
  } = useAdminOrders()

  const handleAutoConfirmWithConfirm = async () => {
    if (!confirm('7일 이상 전에 배송 완료된 주문을 자동 구매확정 하시겠습니까?')) {
      return
    }
    await handleAutoConfirm()
  }

  return (
    <AdminPageLayout
      title="주문 관리"
      description="주문 내역을 조회하고 관리합니다"
      extra={
        <button
          onClick={() => router.push('/admin')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          관리자 홈
        </button>
      }
    >
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">자동 구매확정</h2>
            <p className="text-sm text-gray-600">
              7일 이상 전에 배송 완료된 주문을 자동으로 구매확정 처리하고 포인트를 지급합니다.
            </p>
          </div>
          <button
            onClick={handleAutoConfirmWithConfirm}
            disabled={processingAutoConfirm}
            className="px-6 py-3 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingAutoConfirm ? '처리 중...' : '자동 구매확정 실행'}
          </button>
        </div>
      </div>

      <OrderFilters
        filters={filters}
        onFilterChange={setFilter}
      />

      <OrderStats orders={orders} />

      <OrderList
        orders={orders}
        loading={loading}
        updatingOrderId={updatingOrderId}
        trackingInputs={trackingInputs}
        setTrackingNumber={setTrackingNumber}
        onStatusChange={handleStatusChange}
      />
    </AdminPageLayout>
  )
}
