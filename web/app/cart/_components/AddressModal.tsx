'use client'

import { useRouter } from 'next/navigation'
import { Address } from '@/lib/address/useAddress'
import { formatPhoneNumber } from '@/lib/utils/format-phone'

interface AddressModalProps {
  show: boolean
  onClose: () => void
  addresses: Address[]
  selectedAddressId: string | null
  onSelectAddress: (addressId: string) => void
  onConfirm: () => void
  loading: boolean
}

export default function AddressModal({
  show,
  onClose,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onConfirm,
  loading,
}: AddressModalProps) {
  const router = useRouter()

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-primary-800 text-white px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">배송지 선택</h3>
            <button onClick={onClose} className="text-white text-2xl">×</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800 mx-auto"></div>
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">등록된 배송지가 없습니다</p>
              <button
                onClick={() => {
                  onClose()
                  router.push('/profile/addresses')
                }}
                className="px-4 py-2 bg-white text-red-600 border border-red-600 rounded-lg hover:bg-blue-50"
              >
                배송지 등록하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  onClick={() => onSelectAddress(address.id)}
                  className={`border rounded-lg p-4 cursor-pointer transition ${
                    selectedAddressId === address.id
                      ? 'border-primary-800 bg-primary-50'
                      : 'border-gray-300 hover:border-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-gray-900">
                      {address.recipient_name}
                      {address.recipient_phone && ` | ${formatPhoneNumber(address.recipient_phone)}`}
                    </h4>
                    {address.is_default && (
                      <span className="text-xs bg-primary-800 text-white px-2 py-0.5 rounded">기본</span>
                    )}
                    {selectedAddressId === address.id && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">선택됨</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    {address.address}
                    {address.address_detail && ` ${address.address_detail}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 bg-gray-50 border-t flex gap-2">
          <button
            onClick={() => {
              onClose()
              router.push('/profile/addresses')
            }}
            className="flex-1 py-2.5 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-blue-50"
          >
            배송지 관리
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-800 rounded-lg hover:bg-primary-900"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

