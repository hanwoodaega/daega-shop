'use client'

import { PICKUP_TIME_SLOTS, QUICK_DELIVERY_AREAS, QUICK_DELIVERY_TIME_SLOTS } from '@/lib/utils/constants'

type DeliveryMethod = 'pickup' | 'quick' | 'regular'

interface DeliveryMethodSelectorProps {
  deliveryMethod: DeliveryMethod
  onDeliveryMethodChange: (method: DeliveryMethod) => void
  pickupTime: string
  onPickupTimeChange: (time: string) => void
  quickDeliveryArea: string
  onQuickDeliveryAreaChange: (area: string) => void
  quickDeliveryTime: string
  onQuickDeliveryTimeChange: (time: string) => void
}

export default function DeliveryMethodSelector({
  deliveryMethod,
  onDeliveryMethodChange,
  pickupTime,
  onPickupTimeChange,
  quickDeliveryArea,
  onQuickDeliveryAreaChange,
  quickDeliveryTime,
  onQuickDeliveryTimeChange,
}: DeliveryMethodSelectorProps) {
  return (
    <div className="mb-2 bg-white rounded-lg border border-gray-200 p-3">
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onDeliveryMethodChange('regular')}
          className={`py-2.5 px-3 rounded-lg text-sm font-medium transition ${
            deliveryMethod === 'regular'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          택배배송
        </button>
        <button
          onClick={() => onDeliveryMethodChange('quick')}
          className={`py-2.5 px-3 rounded-lg text-sm font-medium transition ${
            deliveryMethod === 'quick'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          퀵배송
        </button>
        <button
          onClick={() => onDeliveryMethodChange('pickup')}
          className={`py-2.5 px-3 rounded-lg text-sm font-medium transition ${
            deliveryMethod === 'pickup'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          오늘픽업
        </button>
      </div>

      {/* 퀵배송 선택 시 - 지역과 시간대 (양옆으로) */}
      {deliveryMethod === 'quick' && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <select
            value={quickDeliveryArea}
            onChange={(e) => onQuickDeliveryAreaChange(e.target.value)}
            className="w-full px-3 py-2 text-sm md:text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">지역 선택</option>
            {QUICK_DELIVERY_AREAS.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <select
            value={quickDeliveryTime}
            onChange={(e) => onQuickDeliveryTimeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm md:text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">시간대 선택</option>
            {QUICK_DELIVERY_TIME_SLOTS.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      )}

      {/* 픽업 선택 시 - 시간대 */}
      {deliveryMethod === 'pickup' && (
        <div className="mt-3">
          <select
            value={pickupTime}
            onChange={(e) => onPickupTimeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm md:text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">시간 선택</option>
            {PICKUP_TIME_SLOTS.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

