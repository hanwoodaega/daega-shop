'use client'

import { formatPhoneDisplay, parsePhoneInput } from '@/lib/utils/format-phone'

interface GiftRecipientFormProps {
  giftData: {
    message: string
    recipientName: string
    recipientPhone: string
  }
  /** true면 상위 카드 안에 넣을 때 (상단 구분선만) */
  embedded?: boolean
  onRecipientNameChange: (value: string) => void
  onRecipientPhoneChange: (value: string) => void
  onMessageChange: (message: string) => void
}

export default function GiftRecipientForm({
  giftData,
  embedded = false,
  onRecipientNameChange,
  onRecipientPhoneChange,
  onMessageChange,
}: GiftRecipientFormProps) {
  return (
    <div className={embedded ? 'pt-6 border-t border-gray-200' : 'bg-white rounded-lg shadow-md p-6 mb-10'}>
      <h2 className="text-lg font-bold mb-4">받는 분</h2>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={giftData.recipientName}
            onChange={(e) => onRecipientNameChange(e.target.value.trim())}
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
            value={formatPhoneDisplay(giftData.recipientPhone)}
            onChange={(e) => onRecipientPhoneChange(parsePhoneInput(e.target.value))}
            placeholder="휴대폰 번호를 입력해주세요"
            maxLength={13}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            선물 메시지 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={giftData.message}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={4}
            maxLength={150}
            placeholder="받는 분께 전달할 메시지를 작성해주세요"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
          />
          <p className="text-xs text-gray-500 mt-1">{giftData.message.length}/150</p>
        </div>
      </div>
    </div>
  )
}
