import type { OrderFilters } from '../_types'
import { DeliveryType } from '../_types'

type SetFilterFunction = <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => void

interface OrderFiltersProps {
  filters: OrderFilters
  onFilterChange: SetFilterFunction
}

export default function OrderFilters({
  filters,
  onFilterChange,
}: OrderFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 날짜 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            주문 날짜
          </label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => onFilterChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
          />
        </div>

        {/* 배송 유형 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배송 유형
          </label>
          <select
            value={filters.deliveryType}
            onChange={(e) => onFilterChange('deliveryType', e.target.value as DeliveryType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
          >
            <option value="all">전체</option>
            <option value="pickup">매장 픽업</option>
            <option value="quick">퀵배달</option>
            <option value="regular">택배배달</option>
          </select>
        </div>

        {/* 주문 상태 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            주문 상태
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
          >
            <option value="all">전체</option>
            <option value="pending">결제 대기</option>
            <option value="ORDER_RECEIVED">주문완료</option>
            <option value="PREPARING">상품준비중</option>
            <option value="IN_TRANSIT">배송중</option>
            <option value="DELIVERED">배송완료</option>
            <option value="cancelled">주문 취소</option>
          </select>
        </div>
      </div>
    </div>
  )
}

