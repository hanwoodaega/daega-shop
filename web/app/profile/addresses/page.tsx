'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth/auth-context'
import { useAddressesSWR, mutateAddresses, type Address } from '@/lib/swr'
import { formatPhoneNumber } from '@/lib/utils/format-phone'
import { useDaumPostcodeScript, openDaumPostcode, AddressSearchResult } from '@/lib/postcode/useDaumPostcode'
import { useCartStore } from '@/lib/store'

export default function AddressesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  const { addresses, isLoading: loadingAddresses, mutate: mutateAddressesList } = useAddressesSWR()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_phone: '',
    zipcode: '',
    address: '',
    address_detail: '',
    delivery_note: '',
    is_default: false,
  })
  
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?next=/profile/addresses')
    }
  }, [user, loading, router])

  // Daum 우편번호 스크립트 로드
  useDaumPostcodeScript()

  const refreshAddresses = async () => {
    await Promise.all([mutateAddressesList(), mutateAddresses()])
  }

  const handleOpenAddModal = () => {
    setEditingAddress(null)
    setFormData({
      recipient_name: '',
      recipient_phone: '',
      zipcode: '',
      address: '',
      address_detail: '',
      delivery_note: '',
      is_default: addresses.length === 0, // 첫 배송지는 자동으로 기본 배송지
    })
    setShowAddModal(true)
  }

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address)
    setFormData({
      recipient_name: address.recipient_name,
      recipient_phone: address.recipient_phone,
      zipcode: address.zipcode || '',
      address: address.address,
      address_detail: address.address_detail || '',
      delivery_note: address.delivery_note || '',
      is_default: address.is_default,
    })
    setShowAddModal(true)
  }

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // 저장 시 배송지명 자동 생성: 수정 시 기존 유지, 추가 시 기본 배송지 또는 배송지 N
      const addressName = editingAddress
        ? editingAddress.name
        : (formData.is_default ? '기본 배송지' : `배송지 ${addresses.length + 1}`)

      const addressData = {
        name: addressName,
        recipient_name: formData.recipient_name.trim(),
        recipient_phone: formData.recipient_phone,
        zipcode: formData.zipcode.trim() || null,
        address: formData.address.trim(),
        address_detail: formData.address_detail.trim() || null,
        delivery_note: formData.delivery_note.trim() || null,
        is_default: formData.is_default,
      }

      if (editingAddress) {
        // 수정 - 서버 API 사용
        const res = await fetch(`/api/addresses/${editingAddress.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(addressData),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || '배송지 수정 실패')
        }
      } else {
        // 추가 - 서버 API 사용
        const res = await fetch('/api/addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(addressData),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || '배송지 추가 실패')
        }
      }

      await refreshAddresses()
      setShowAddModal(false)
      toast.success(editingAddress ? '배송지가 수정되었습니다.' : '배송지가 추가되었습니다.')
    } catch (error: any) {
      console.error('배송지 저장 실패:', error)
      toast.error(error.message || '배송지 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const res = await fetch(`/api/addresses/${addressId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '배송지 삭제 실패')
      }

      await refreshAddresses()
      toast.success('배송지가 삭제되었습니다.', { id: 'address-delete' })
    } catch (error: any) {
      console.error('배송지 삭제 실패:', error)
      toast.error(error.message || '배송지 삭제에 실패했습니다.')
    }
  }

  const handleSetDefault = async (addressId: string) => {
    try {
      const res = await fetch(`/api/addresses/${addressId}/default`, {
        method: 'PUT',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '기본 배송지 설정 실패')
      }

      await refreshAddresses()
      toast.success('기본 배송지로 설정되었습니다.')
    } catch (error: any) {
      console.error('기본 배송지 설정 실패:', error)
      toast.error(error.message || '기본 배송지 설정에 실패했습니다.')
    }
  }

  const handleSearchAddress = () => {
    openDaumPostcode((data: AddressSearchResult) => {
      setFormData({
        ...formData,
        zipcode: data.zonecode,
        address: data.address,
      })

      // 상세주소 입력 필드로 포커스 이동
      setTimeout(() => {
        const detailInput = document.getElementById('address_detail')
        if (detailInput) {
          detailInput.focus()
        }
      }, 100)
    })
  }

  if (loading || loadingAddresses) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">배송지 관리</h1>
            </div>
            <div className="ml-auto flex items-center">
              <button
                onClick={() => router.push('/cart')}
                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                aria-label="장바구니"
              >
                <svg className="w-8 h-8 md:w-9 md:h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span
                  className={`absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
                    cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                  }`}
                  suppressHydrationWarning
                  aria-hidden={cartCount <= 0}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* PC 전용: DOM 순서상 먼저 배치해 PC에서 모바일 UI 플래시 방지 */}
      <div className="hidden lg:block flex-1 w-full">
        <div className="container mx-auto px-4 py-6 pb-6 max-w-none">
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4 shadow-sm">
            <h2 className="text-2xl font-bold text-primary-900 text-center">배송지 관리</h2>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-semibold text-gray-900">배송지 목록</div>
            <button
              onClick={handleOpenAddModal}
              className="bg-white text-red-600 border border-red-600 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-50 transition"
            >
              + 배송지추가
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
              <svg className="w-10 h-10 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-600 mb-6">등록된 배송지가 없습니다.</p>
              <button
                onClick={handleOpenAddModal}
                className="bg-white text-red-600 border border-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                배송지 추가하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        {address.address.split('(')[0].trim()}
                      </h3>
                      {address.is_default && (
                        <span className="bg-primary-800 text-white text-xs px-2 py-0.5 rounded">기본</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAddress(address)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        수정
                      </button>
                      {!address.is_default && (
                        <button
                          onClick={() => handleDeleteAddress(address.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p className="text-gray-600">
                      {address.zipcode && `(${address.zipcode}) `}
                      {address.address}
                      {address.address_detail && `, ${address.address_detail}`}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {address.recipient_name} | {formatPhoneNumber(address.recipient_phone)}
                  </p>
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="mt-3 w-full border border-red-600 text-red-600 py-2 rounded-lg text-sm hover:bg-blue-50 transition"
                    >
                      기본 배송지로 설정
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 모바일 전용 헤더 */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">배송지 관리</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 pb-24 lg:py-6 lg:pb-6 lg:max-w-none">
        {/* 모바일 전용 */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-base font-semibold text-gray-900">배송지 목록</div>
            <button
              onClick={handleOpenAddModal}
              className="bg-white text-red-600 border border-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 transition"
            >
              + 배송지추가
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📍</div>
              <p className="text-xl text-gray-600 mb-6">등록된 배송지가 없습니다.</p>
              <button
                onClick={handleOpenAddModal}
                className="bg-white text-red-600 border border-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                배송지 추가하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        {address.address.split('(')[0].trim()}
                      </h3>
                      {address.is_default && (
                        <span className="bg-primary-800 text-white text-xs px-2 py-0.5 rounded">
                          기본
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAddress(address)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        수정
                      </button>
                      {!address.is_default && (
                        <button
                          onClick={() => handleDeleteAddress(address.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-700">
                    <p className="text-gray-600">
                      {address.zipcode && `(${address.zipcode}) `}
                      {address.address}
                      {address.address_detail && `, ${address.address_detail}`}
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {address.recipient_name} | {formatPhoneNumber(address.recipient_phone)}
                  </p>

                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="mt-3 w-full border border-red-600 text-red-600 py-2 rounded-lg text-sm hover:bg-blue-50 transition"
                    >
                      기본 배송지로 설정
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 배송지 추가/수정 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {editingAddress ? '배송지 수정' : '배송지 추가'}
            </h2>
            
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  받는 분 *
                </label>
                <input
                  type="text"
                  value={formData.recipient_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recipient_name: e.target.value.slice(0, 10),
                    })
                  }
                  required
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="최대 10자 이내"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연락처 *
                </label>
                <input
                  type="tel"
                  value={formData.recipient_phone}
                  onChange={(e) => {
                    const numbers = e.target.value.replace(/[^0-9]/g, '')
                    let formatted = numbers

                    if (numbers.length > 3 && numbers.length <= 7) {
                      // 0101234 -> 010-1234
                      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`
                    } else if (numbers.length > 7) {
                      // 01012345678 -> 010-1234-5678
                      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
                    }

                    setFormData({ ...formData, recipient_phone: formatted })
                  }}
                  required
                  maxLength={13}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="휴대폰 번호를 입력해주세요"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주소 *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.zipcode}
                    readOnly
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder=""
                  />
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    className="px-3 py-2 bg-white text-red-600 border border-red-600 rounded-lg hover:bg-blue-50 transition whitespace-nowrap flex-shrink-0 text-sm"
                  >
                    주소찾기
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.address}
                  readOnly
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder=""
                />
              </div>

              <div>
                <input
                  type="text"
                  id="address_detail"
                  value={formData.address_detail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address_detail: e.target.value.slice(0, 15),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="상세주소를 입력해주세요"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배송 요청사항
                </label>
                <textarea
                  value={formData.delivery_note}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      delivery_note: e.target.value.slice(0, 50),
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="예: 공동현관 비밀번호 #1234"
                  maxLength={50}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 accent-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="is_default" className="ml-2 text-sm text-gray-700 cursor-pointer">
                  기본 배송지로 설정
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-white text-red-600 border border-red-600 py-2 rounded-lg hover:bg-blue-50 transition disabled:bg-gray-400 disabled:text-gray-500 disabled:border-gray-400"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

