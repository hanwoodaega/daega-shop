'use client'

interface GiftSenderInfoProps {
  formData: {
    name: string
    phone: string
  }
  /** true면 카드 wrapper 없이 내용만 렌더 (상위 카드 안에 넣을 때) */
  embedded?: boolean
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPhoneChange: (value: string) => void
}

export default function GiftSenderInfo({
  formData,
  embedded = false,
  onInputChange,
  onPhoneChange,
}: GiftSenderInfoProps) {
  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return ''
    const numbers = phone.replace(/[^0-9]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  return (
    <div className={embedded ? 'pb-6' : 'bg-white rounded-lg shadow-md p-6 mb-10'}>
      <h2 className="text-lg font-bold mb-4">보내는 분</h2>
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
            placeholder="이름을 입력해주세요"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            연락처 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={formatPhoneDisplay(formData.phone)}
            onChange={(e) => {
              const numbers = e.target.value.replace(/[^0-9]/g, '').slice(0, 11)
              onPhoneChange(numbers)
            }}
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
