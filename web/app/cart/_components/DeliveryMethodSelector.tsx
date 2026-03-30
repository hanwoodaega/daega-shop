'use client'

import { PICKUP_TIME_SLOTS } from '@/lib/utils/constants'
import { DeliveryMethod } from '@/lib/cart'

interface DeliveryMethodSelectorProps {
  deliveryMethod: DeliveryMethod
  onDeliveryMethodChange: (method: DeliveryMethod) => void
  pickupTime: string
  onPickupTimeChange: (time: string) => void
}

export default function DeliveryMethodSelector({
  deliveryMethod,
  onDeliveryMethodChange,
  pickupTime,
  onPickupTimeChange,
}: DeliveryMethodSelectorProps) {
  return (
    <div className="mb-2 bg-white rounded-lg border border-gray-200 p-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
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
          type="button"
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

      {deliveryMethod === 'pickup' && (
        <div className="mt-3">
          <select
            value={pickupTime}
            onChange={(e) => onPickupTimeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm md:text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">시간 선택</option>
            {PICKUP_TIME_SLOTS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
