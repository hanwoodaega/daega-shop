'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Coupon } from '@/lib/supabase'

export default function CouponsPage() {
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [issueConditions, setIssueConditions] = useState({
    birthday_month: '',
    min_purchase_amount: '',
    purchase_period_start: '',
    purchase_period_end: '',
    min_purchase_count: '',
    phone: '',  // 특정 개인 지급용 전화번호
  })

  // 새 쿠폰 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    min_purchase_amount: 0,
    max_discount_amount: 0,
    validity_days: 7,  // 유효 기간 (일수) - 기본값 7일
    usage_limit: '',
    is_first_purchase_only: false,
  })

  useEffect(() => {
    checkAdminAuth()
  }, [router])

  const checkAdminAuth = async () => {
    try {
      // 관리자 인증 확인
      const res = await fetch('/api/admin/login', {
        method: 'GET',
      })
      if (res.status === 401) {
        router.push('/admin/login?next=/admin/coupons')
        return
      }
      fetchCoupons()
    } catch (error) {
      console.error('인증 확인 실패:', error)
      router.push('/admin/login?next=/admin/coupons')
    }
  }

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons')
      
      if (res.status === 401) {
        router.push('/admin/login?next=/admin/coupons')
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '쿠폰 조회 실패')
      }

      const data = await res.json()
      setCoupons(data.coupons || [])
    } catch (error: any) {
      console.error('쿠폰 조회 실패:', error)
      toast.error(error.message || '쿠폰 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.validity_days || formData.validity_days <= 0) {
      toast.error('필수 항목을 입력해주세요.')
      return
    }

    if (formData.discount_value <= 0) {
      toast.error('할인 금액/율을 입력해주세요.')
      return
    }

    // 할인율 쿠폰일 때 최대 할인 금액 필수 체크
    if (formData.discount_type === 'percentage' && (!formData.max_discount_amount || formData.max_discount_amount <= 0)) {
      toast.error('할인율 쿠폰은 최대 할인 금액을 입력해야 합니다.')
      return
    }

    try {
      const couponData = {
        name: formData.name,
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_purchase_amount: formData.min_purchase_amount > 0 ? formData.min_purchase_amount : null,
        max_discount_amount: formData.discount_type === 'percentage' 
          ? formData.max_discount_amount 
          : null,
        validity_days: formData.validity_days,
        is_active: true,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_first_purchase_only: formData.is_first_purchase_only,
      }

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(couponData),
      })

      if (res.status === 401) {
        router.push('/admin/login?next=/admin/coupons')
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '쿠폰 생성에 실패했습니다.')
      }

      toast.success('쿠폰이 생성되었습니다.')
      setShowCreateModal(false)
      resetForm()
      fetchCoupons()
    } catch (error: any) {
      console.error('쿠폰 생성 실패:', error)
      toast.error(error.message || '쿠폰 생성에 실패했습니다.')
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase_amount: coupon.min_purchase_amount || 0,
      max_discount_amount: coupon.max_discount_amount || 0,
      validity_days: coupon.validity_days || 7,
      usage_limit: coupon.usage_limit?.toString() || '',
      is_first_purchase_only: coupon.is_first_purchase_only,
    })
    setShowCreateModal(true)
  }

  const handleUpdate = async () => {
    if (!editingCoupon) return

    // 할인율 쿠폰일 때 최대 할인 금액 필수 체크
    if (formData.discount_type === 'percentage' && (!formData.max_discount_amount || formData.max_discount_amount <= 0)) {
      toast.error('할인율 쿠폰은 최대 할인 금액을 입력해야 합니다.')
      return
    }

    try {
      const updates = {
        name: formData.name,
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_purchase_amount: formData.min_purchase_amount > 0 ? formData.min_purchase_amount : null,
        max_discount_amount: formData.discount_type === 'percentage' 
          ? formData.max_discount_amount 
          : null,
        validity_days: formData.validity_days,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_first_purchase_only: formData.is_first_purchase_only,
      }

      const res = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.status === 401) {
        router.push('/admin/login?next=/admin/coupons')
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '쿠폰 수정에 실패했습니다.')
      }

      toast.success('쿠폰이 수정되었습니다.')
      setShowCreateModal(false)
      setEditingCoupon(null)
      resetForm()
      fetchCoupons()
    } catch (error: any) {
      console.error('쿠폰 수정 실패:', error)
      toast.error(error.message || '쿠폰 수정에 실패했습니다.')
    }
  }

  const handleDelete = async (couponId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
      })

      if (res.status === 401) {
        router.push('/admin/login?next=/admin/coupons')
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '쿠폰 삭제에 실패했습니다.')
      }

      toast.success('쿠폰이 삭제되었습니다.')
      fetchCoupons()
    } catch (error: any) {
      console.error('쿠폰 삭제 실패:', error)
      toast.error(error.message || '쿠폰 삭제에 실패했습니다.')
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })

      if (res.status === 401) {
        router.push('/admin/login?next=/admin/coupons')
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '쿠폰 상태 변경에 실패했습니다.')
      }

      toast.success(`쿠폰이 ${!coupon.is_active ? '활성화' : '비활성화'}되었습니다.`)
      fetchCoupons()
    } catch (error: any) {
      console.error('쿠폰 상태 변경 실패:', error)
      toast.error(error.message || '쿠폰 상태 변경에 실패했습니다.')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_purchase_amount: 0,
      max_discount_amount: 0,
      validity_days: 7,
      usage_limit: '',
      is_first_purchase_only: false,
    })
  }

  const handleIssueToAll = async (couponId: string) => {
    if (!confirm('모든 사용자에게 이 쿠폰을 지급하시겠습니까?')) return

    try {
      const res = await fetch('/api/admin/coupons/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon_id: couponId }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || '쿠폰이 지급되었습니다.')
      } else {
        toast.error(data.error || '쿠폰 지급에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('쿠폰 일괄 지급 실패:', error)
      toast.error('쿠폰 지급에 실패했습니다.')
    }
  }

  const handleIssueWithConditions = async () => {
    if (!selectedCoupon) return

    // 조건 검증
    const conditions: any = {}
    let hasCondition = false

    // 전화번호 조건 (특정 개인 지급)
    if (issueConditions.phone) {
      // 숫자만 추출 (하이픈 제거)
      const phoneNumber = issueConditions.phone.replace(/[^0-9]/g, '')
      if (phoneNumber.length < 10 || phoneNumber.length > 11) {
        toast.error('올바른 전화번호를 입력해주세요.')
        return
      }
      conditions.phone = phoneNumber
      hasCondition = true
    }

    if (issueConditions.birthday_month) {
      conditions.birthday_month = parseInt(issueConditions.birthday_month)
      hasCondition = true
    }

    if (issueConditions.min_purchase_amount) {
      conditions.min_purchase_amount = parseInt(issueConditions.min_purchase_amount)
      hasCondition = true
    }

    if (issueConditions.min_purchase_count) {
      conditions.min_purchase_count = parseInt(issueConditions.min_purchase_count)
      hasCondition = true
    }

    if (issueConditions.purchase_period_start || issueConditions.purchase_period_end) {
      if (!issueConditions.purchase_period_start || !issueConditions.purchase_period_end) {
        toast.error('구매 기간의 시작일과 종료일을 모두 입력해주세요.')
        return
      }
      conditions.purchase_period_start = new Date(issueConditions.purchase_period_start).toISOString()
      conditions.purchase_period_end = new Date(issueConditions.purchase_period_end).toISOString()
      hasCondition = true
    }

    if (!hasCondition) {
      toast.error('최소 하나의 조건을 선택해주세요.')
      return
    }

    try {
      const res = await fetch('/api/admin/coupons/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          coupon_id: selectedCoupon.id,
          conditions 
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || '쿠폰이 지급되었습니다.')
        setShowIssueModal(false)
        setSelectedCoupon(null)
      } else {
        toast.error(data.error || '쿠폰 지급에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('쿠폰 조건별 지급 실패:', error)
      toast.error('쿠폰 지급에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">쿠폰 관리</h1>
          <button
            onClick={() => {
              setEditingCoupon(null)
              resetForm()
              setShowCreateModal(true)
            }}
            className="bg-primary-800 text-white px-4 py-2 rounded-lg hover:bg-primary-900 transition"
          >
            + 쿠폰 생성
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">쿠폰명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">할인</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">유효기간</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용 횟수</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">첫구매 전용</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{coupon.name}</div>
                    {coupon.description && (
                      <div className="text-sm text-gray-500">{coupon.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coupon.discount_type === 'percentage' 
                      ? `${coupon.discount_value}%` 
                      : `${coupon.discount_value.toLocaleString()}원`}
                    {coupon.min_purchase_amount && (
                      <div className="text-xs text-gray-500">
                        최소 {coupon.min_purchase_amount.toLocaleString()}원
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coupon.validity_days}일
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coupon.usage_count} / {coupon.usage_limit || '∞'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coupon.is_first_purchase_only ? '✓' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {coupon.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => toggleActive(coupon)}
                      className="text-blue-600 hover:text-red-600"
                    >
                      {coupon.is_active ? '비활성화' : '활성화'}
                    </button>
                    {coupon.is_active && (
                      <>
                        {coupon.is_first_purchase_only ? (
                          <span className="text-sm text-gray-500">
                            회원가입 시 자동 지급
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSelectedCoupon(coupon)
                                setIssueConditions({
                                  birthday_month: '',
                                  min_purchase_amount: '',
                                  purchase_period_start: '',
                                  purchase_period_end: '',
                                  min_purchase_count: '',
                                  phone: '',
                                })
                                setShowIssueModal(true)
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              조건별 지급
                            </button>
                            <button
                              onClick={() => handleIssueToAll(coupon.id)}
                              className="text-blue-600 hover:text-red-600"
                            >
                              전체 지급
                            </button>
                          </>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 쿠폰 생성/수정 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingCoupon ? '쿠폰 수정' : '쿠폰 생성'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    쿠폰명 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    할인 유형 *
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="percentage">할인율 (%)</option>
                    <option value="fixed">고정 금액 (원)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.discount_type === 'percentage' ? '할인율 (%) *' : '할인 금액 (원) *'}
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                    required
                  />
                </div>

                {formData.discount_type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      최대 할인 금액 (원) *
                    </label>
                    <input
                      type="number"
                      value={formData.max_discount_amount}
                      onChange={(e) => setFormData({ ...formData, max_discount_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="1"
                      required
                      placeholder="예: 10000"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      할인율 적용 시 최대 할인 가능한 금액을 입력하세요
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최소 구매 금액 (원)
                  </label>
                  <input
                    type="number"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    유효 기간 (일) *
                  </label>
                  <input
                    type="number"
                    value={formData.validity_days}
                    onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    쿠폰이 발급된 날짜부터 해당 일수만큼 유효합니다.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사용 횟수 제한 (비워두면 무제한)
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_first_purchase_only"
                    checked={formData.is_first_purchase_only}
                    onChange={(e) => setFormData({ ...formData, is_first_purchase_only: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="is_first_purchase_only" className="text-sm font-medium text-gray-700">
                    첫구매 전용 쿠폰
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingCoupon(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={editingCoupon ? handleUpdate : handleCreate}
                  className="px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900"
                >
                  {editingCoupon ? '수정' : '생성'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 조건별 쿠폰 지급 모달 */}
        {showIssueModal && selectedCoupon && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                조건별 쿠폰 지급: {selectedCoupon.name}
              </h2>

              <div className="space-y-4 mb-6">
                <div className="border-b pb-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">특정 개인 지급</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      전화번호
                    </label>
                    <input
                      type="tel"
                      value={issueConditions.phone}
                      onChange={(e) => {
                        // 숫자만 입력 허용 (하이픈은 자동 제거)
                        const numbers = e.target.value.replace(/[^0-9]/g, '')
                        setIssueConditions({ ...issueConditions, phone: numbers })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="01012345678"
                      maxLength={11}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      특정 개인에게 지급하려면 전화번호를 입력하세요. (하이픈 없이 숫자만)
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">생일 조건</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이번 달 생일인 사용자
                    </label>
                    <select
                      value={issueConditions.birthday_month}
                      onChange={(e) => setIssueConditions({ ...issueConditions, birthday_month: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">선택 안함</option>
                      <option value="1">1월</option>
                      <option value="2">2월</option>
                      <option value="3">3월</option>
                      <option value="4">4월</option>
                      <option value="5">5월</option>
                      <option value="6">6월</option>
                      <option value="7">7월</option>
                      <option value="8">8월</option>
                      <option value="9">9월</option>
                      <option value="10">10월</option>
                      <option value="11">11월</option>
                      <option value="12">12월</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">구매 이력 조건</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        구매 기간 시작일
                      </label>
                      <input
                        type="date"
                        value={issueConditions.purchase_period_start}
                        onChange={(e) => setIssueConditions({ ...issueConditions, purchase_period_start: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        구매 기간 종료일
                      </label>
                      <input
                        type="date"
                        value={issueConditions.purchase_period_end}
                        onChange={(e) => setIssueConditions({ ...issueConditions, purchase_period_end: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최소 구매 금액 (원)
                      </label>
                      <input
                        type="number"
                        value={issueConditions.min_purchase_amount}
                        onChange={(e) => setIssueConditions({ ...issueConditions, min_purchase_amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        placeholder="예: 50000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최소 구매 횟수
                      </label>
                      <input
                        type="number"
                        value={issueConditions.min_purchase_count}
                        onChange={(e) => setIssueConditions({ ...issueConditions, min_purchase_count: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        placeholder="예: 3"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-sm text-red-600">
                  <p className="font-semibold mb-1">💡 조건 안내:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>전화번호: 특정 개인에게 지급하려면 전화번호만 입력하세요 (다른 조건과 함께 사용 가능)</li>
                    <li>생일 조건: 선택한 월에 생일인 사용자에게 지급</li>
                    <li>구매 금액: 지정한 기간 동안 총 구매 금액이 기준 이상인 사용자</li>
                    <li>구매 횟수: 지정한 기간 동안 구매 횟수가 기준 이상인 사용자</li>
                    <li>여러 조건을 동시에 설정하면 모든 조건을 만족하는 사용자에게만 지급됩니다</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowIssueModal(false)
                    setSelectedCoupon(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleIssueWithConditions}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  조건별 지급
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

