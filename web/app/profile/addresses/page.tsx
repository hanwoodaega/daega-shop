'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import { useAuth } from '@/lib/auth-context'
import { supabase, Address } from '@/lib/supabase'
import { formatPhoneNumber } from '@/lib/format-phone'

// Daum 우편번호 서비스 타입 정의
declare global {
  interface Window {
    daum: any
  }
}

export default function AddressesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
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
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchAddresses()
    }
  }, [user])

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (error) {
      console.error('배송지 조회 실패:', error)
    } finally {
      setLoadingAddresses(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingAddress(null)
    setFormData({
      name: '',
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
      name: address.name,
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
      // 배송지명이 없으면 기본값 설정
      const addressName = formData.name.trim() || 
        (formData.is_default ? '기본 배송지' : `배송지 ${addresses.length + 1}`)

      const addressData = {
        user_id: user!.id,
        name: addressName,
        recipient_name: formData.recipient_name.trim(),
        recipient_phone: formData.recipient_phone,
        zipcode: formData.zipcode.trim() || null,
        address: formData.address.trim(),
        address_detail: formData.address_detail.trim() || null,
        delivery_note: formData.delivery_note.trim() || null,
        is_default: formData.is_default,
        updated_at: new Date().toISOString(),
      }

      if (editingAddress) {
        // 수정
        const { error } = await supabase
          .from('addresses')
          .update(addressData)
          .eq('id', editingAddress.id)

        if (error) throw error
      } else {
        // 추가
        const { error } = await supabase
          .from('addresses')
          .insert(addressData)

        if (error) throw error
      }

      await fetchAddresses()
      setShowAddModal(false)
      alert(editingAddress ? '배송지가 수정되었습니다.' : '배송지가 추가되었습니다.')
    } catch (error: any) {
      console.error('배송지 저장 실패:', error)
      alert('배송지 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('이 배송지를 삭제하시겠습니까?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId)

      if (error) throw error

      await fetchAddresses()
      alert('배송지가 삭제되었습니다.')
    } catch (error) {
      console.error('배송지 삭제 실패:', error)
      alert('배송지 삭제에 실패했습니다.')
    }
  }

  const handleSetDefault = async (addressId: string) => {
    try {
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId)

      if (error) throw error

      await fetchAddresses()
    } catch (error) {
      console.error('기본 배송지 설정 실패:', error)
      alert('기본 배송지 설정에 실패했습니다.')
    }
  }

  const handleSearchAddress = () => {
    if (!window.daum) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    new window.daum.Postcode({
      oncomplete: function(data: any) {
        // 사용자가 선택한 주소 정보
        let fullAddress = data.address // 기본 주소
        let extraAddress = '' // 참고 항목

        // 참고항목이 있는 경우 추가
        if (data.addressType === 'R') {
          if (data.bname !== '') {
            extraAddress += data.bname
          }
          if (data.buildingName !== '') {
            extraAddress += (extraAddress !== '' ? ', ' + data.buildingName : data.buildingName)
          }
          fullAddress += (extraAddress !== '' ? ' (' + extraAddress + ')' : '')
        }

        // 폼 데이터 업데이트
        setFormData({
          ...formData,
          zipcode: data.zonecode,
          address: fullAddress,
        })

        // 상세주소 입력 필드로 포커스 이동
        setTimeout(() => {
          const detailInput = document.getElementById('address_detail')
          if (detailInput) {
            detailInput.focus()
          }
        }, 100)
      }
    }).open()
  }

  if (loading || loadingAddresses) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-3 p-1 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">배송지 관리</h1>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="bg-primary-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-900 transition"
          >
            + 배송지 추가
          </button>
        </div>

        {/* 배송지 목록 */}
        {addresses.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📍</div>
            <p className="text-xl text-gray-600 mb-6">등록된 배송지가 없습니다.</p>
            <button
              onClick={handleOpenAddModal}
              className="bg-primary-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-900 transition"
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
                    <h3 className="text-base font-bold text-gray-900">{address.name}</h3>
                    {address.is_default && (
                      <span className="bg-primary-800 text-white text-xs px-2 py-0.5 rounded">
                        기본배송지
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
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm text-gray-700">
                  <p className="font-medium">{address.recipient_name} | {formatPhoneNumber(address.recipient_phone)}</p>
                  <p className="text-gray-600">
                    {address.zipcode && `(${address.zipcode}) `}
                    {address.address}
                    {address.address_detail && `, ${address.address_detail}`}
                  </p>
                  {address.delivery_note && (
                    <p className="text-gray-500 text-xs mt-1">
                      💬 {address.delivery_note}
                    </p>
                  )}
                </div>

                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="mt-3 w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                  >
                    기본 배송지로 설정
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
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
                  배송지명
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="예: 집, 회사, 친척집 (선택사항)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수령인 *
                </label>
                <input
                  type="text"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="홍길동"
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
                    setFormData({ ...formData, recipient_phone: numbers })
                  }}
                  required
                  maxLength={11}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="01012345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  우편번호
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.zipcode}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="우편번호"
                  />
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition whitespace-nowrap"
                  >
                    주소찾기
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주소 *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  readOnly
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="주소찾기 버튼을 클릭하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상세주소
                </label>
                <input
                  type="text"
                  id="address_detail"
                  value={formData.address_detail}
                  onChange={(e) => setFormData({ ...formData, address_detail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="101동 101호"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배송 요청사항
                </label>
                <textarea
                  value={formData.delivery_note}
                  onChange={(e) => setFormData({ ...formData, delivery_note: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="예: 공동현관 비밀번호 #1234, 문 앞에 놓아주세요"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-primary-800 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
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
                  className="flex-1 bg-primary-800 text-white py-2 rounded-lg hover:bg-primary-900 transition disabled:bg-gray-400"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <BottomNavbar />
    </div>
  )
}

