'use client'

interface DeliveryFormQuickProps {
  formData: {
    zipcode: string
    address: string
    addressDetail: string
    message: string
  }
  hasDefaultAddress: boolean
  saveAsDefaultAddress: boolean
  onSearchAddress: () => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSaveAsDefaultChange: (checked: boolean) => void
}

export default function DeliveryFormQuick({
  formData,
  hasDefaultAddress,
  saveAsDefaultAddress,
  onSearchAddress,
  onInputChange,
  onSaveAsDefaultChange,
}: DeliveryFormQuickProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold mb-4">배송 정보</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            우편번호
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2 min-w-0">
            <input
              type="text"
              name="zipcode"
              value={formData.zipcode}
              readOnly
              className="w-full min-w-0 px-3 py-2 md:px-4 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              placeholder="우편번호"
            />
            <button
              type="button"
              onClick={onSearchAddress}
              className="px-3 py-2 md:px-4 bg-red-600 text-white rounded-lg hover:bg-red-600 transition whitespace-nowrap text-sm md:text-base"
            >
              주소찾기
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            주소 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            readOnly
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            placeholder="주소찾기 버튼을 클릭하세요"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            상세 주소
          </label>
          <input
            type="text"
            id="quick_address_detail"
            name="addressDetail"
            value={formData.addressDetail}
            onChange={onInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="101동 101호"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            배송 요청사항
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={onInputChange}
            rows={3}
            maxLength={50}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="예: 공동현관 비밀번호 #1234, 전화주세요"
          />
          <p className="text-xs text-gray-500 mt-1 text-right">{formData.message.length}/50</p>
        </div>

        {!hasDefaultAddress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="save_as_default_quick"
                checked={saveAsDefaultAddress}
                onChange={(e) => onSaveAsDefaultChange(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-primary-800 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="save_as_default_quick" className="ml-2 text-sm text-red-600">
                <span className="font-semibold">이 주소를 기본 배송지로 저장</span>
                <p className="text-xs text-blue-700 mt-1">
                  다음 주문부터 자동으로 입력됩니다.
                </p>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

