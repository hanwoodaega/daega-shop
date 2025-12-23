'use client'

interface OrdererInfoProps {
  formData: {
    name: string
    phone: string
  }
  isEditingOrderer: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPhoneChange: (value: string) => void
}

export default function OrdererInfo({
  formData,
  isEditingOrderer,
  onEdit,
  onCancel,
  onSave,
  onInputChange,
  onPhoneChange,
}: OrdererInfoProps) {
  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    const numbers = phone.replace(/[^0-9]/g, '')
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    } else if (numbers.length === 10) {
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
      } else {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
      }
    }
    return phone
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">주문자</h2>
        {!isEditingOrderer && (
          <button
            type="button"
            onClick={onEdit}
            className="px-2 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-1"
          >
            <span>수정</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      {!isEditingOrderer ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-normal text-gray-500">이름</div>
            <div className="text-base font-semibold text-gray-900">{formData.name || '-'}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-normal text-gray-500">연락처</div>
            <div className="text-base font-semibold text-gray-900">{formatPhone(formData.phone)}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              연락처 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) => {
                const numbers = e.target.value.replace(/[^0-9]/g, '')
                onPhoneChange(numbers)
              }}
              required
              placeholder="01012345678"
              maxLength={11}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSave}
              className="flex-1 bg-primary-800 text-white py-2 rounded-lg font-semibold hover:bg-primary-900 transition text-sm"
            >
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

