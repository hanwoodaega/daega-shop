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
    handleRefundComplete,
    handleAutoConfirm,
  } = useAdminOrders()

  const handleAutoConfirmWithConfirm = async () => {
    if (!confirm('Do you want to automatically confirm orders that were delivered more than 7 days ago?')) {
      return
    }
    await handleAutoConfirm()
  }

  return (
    <AdminPageLayout
      title="Order Management"
      description="View and manage all order details"
      extra={
        <button
          onClick={() => router.push('/admin')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Admin Home
        </button>
      }
    >
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Auto-Confirm</h2>
            <p className="text-sm text-gray-600">
              Automatically confirms orders delivered more than 7 days ago and awards points.
            </p>
          </div>
          <button
            onClick={handleAutoConfirmWithConfirm}
            disabled={processingAutoConfirm}
            className="px-6 py-3 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingAutoConfirm ? 'Processing...' : 'Run Auto-Confirm'}
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
        onRefundComplete={handleRefundComplete}
      />
    </AdminPageLayout>
  )
}
