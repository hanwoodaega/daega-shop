'use client'

import { formatPhoneDisplay, parsePhoneInput } from '@/lib/utils/format-phone'

interface OrdererInfoProps {
  formData: {
    name: string
    phone: string
  }
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPhoneChange: (value: string) => void
}

export default function OrdererInfo({
  formData,
  onInputChange,
  onPhoneChange,
}: OrdererInfoProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold mb-4">주문자</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            required
            placeholder="이름을 입력해주세요"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            연락처 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={formatPhoneDisplay(formData.phone)}
            onChange={(e) => onPhoneChange(parsePhoneInput(e.target.value))}
            required
            placeholder="휴대폰 번호를 입력해주세요"
            maxLength={13}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
          />
        </div>
      </div>
    </div>
  )
}
