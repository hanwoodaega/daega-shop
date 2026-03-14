'use client'

import { useRouter } from 'next/navigation'
import { useAdminOrders } from './_hooks/useAdminOrders'
import OrderFilters from './_components/OrderFilters'
import OrderStats from './_components/OrderStats'
import OrderTable from './_components/OrderTable'
import AdminPageLayout from '../_components/AdminPageLayout'

export default function AdminOrdersPage() {
  const router = useRouter()
  const {
    orders,
    loading,
    filters,
    setFilter,
  } = useAdminOrders()

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
      <OrderFilters
        filters={filters}
        onFilterChange={setFilter}
      />

      <OrderStats orders={orders} />

      <OrderTable orders={orders} loading={loading} />
    </AdminPageLayout>
  )
}
