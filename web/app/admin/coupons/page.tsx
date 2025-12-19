'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coupon } from '@/lib/supabase'
import CouponTable from './_components/CouponTable'
import CouponFormModal from './_components/CouponFormModal'
import CouponIssueModal from './_components/CouponIssueModal'
import { useCoupons } from './_hooks/useCoupons'
import { useCouponForm } from './_hooks/useCouponForm'
import { useIssueCoupon } from './_hooks/useIssueCoupon'

export default function CouponsPage() {
  const router = useRouter()
  const { coupons, loading, error, refetch } = useCoupons()
  const {
    formData,
    setFormData,
    editingCoupon,
    setEditing,
    resetForm,
    handleCreate,
    handleUpdate,
    handleDelete,
    toggleActive,
  } = useCouponForm()
  const {
    selectedCoupon,
    setSelectedCoupon,
    issueConditions,
    setIssueConditions,
    resetConditions,
    handleIssueToAll,
    handleIssueWithConditions,
  } = useIssueCoupon()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showIssueModal, setShowIssueModal] = useState(false)

  // useCoupons에서 반환된 에러 처리 (401이면 로그인 페이지로)
  useEffect(() => {
    if (error?.status === 401) {
      router.push('/admin/login?next=/admin/coupons')
    }
  }, [error, router])

  const handleEdit = (coupon: Coupon) => {
    setEditing(coupon)
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async () => {
    const result = await handleCreate()
    if (result.success) {
      resetForm()
      setShowCreateModal(false)
      refetch()
    } else if (result.error?.status === 401) {
      router.push('/admin/login?next=/admin/coupons')
    }
  }

  const handleUpdateSubmit = async () => {
    const result = await handleUpdate()
    if (result.success) {
      resetForm()
      setShowCreateModal(false)
      refetch()
    } else if (result.error?.status === 401) {
      router.push('/admin/login?next=/admin/coupons')
    }
  }

  const handleDeleteSubmit = async (couponId: string) => {
    const result = await handleDelete(couponId)
    if (result.success) {
      refetch()
    } else if (result.error?.status === 401) {
        router.push('/admin/login?next=/admin/coupons')
    }
  }

  const handleToggleActive = async (coupon: Coupon) => {
    const result = await toggleActive(coupon)
    if (result.success) {
      refetch()
    } else if (result.error?.status === 401) {
        router.push('/admin/login?next=/admin/coupons')
    }
  }

  const handleIssueWithConditionsClick = (coupon: Coupon) => {
    setSelectedCoupon(coupon)
    resetConditions()
    setShowIssueModal(true)
  }

  const handleIssueWithConditionsSubmit = async () => {
    const result = await handleIssueWithConditions()
    if (result.success) {
      setShowIssueModal(false)
      refetch()
    } else if (result.error?.status === 401) {
      router.push('/admin/login?next=/admin/coupons')
    }
  }

  const handleIssueToAllClick = async (couponId: string) => {
    if (!confirm('모든 사용자에게 이 쿠폰을 지급하시겠습니까?')) return
    
    const result = await handleIssueToAll(couponId)
    if (result.success) {
      refetch()
    } else if (result.error?.status === 401) {
      router.push('/admin/login?next=/admin/coupons')
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
        {/* 에러 표시 (401은 redirect되므로 여기서는 500 등 다른 에러만 표시) */}
        {error && error.status !== 401 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-red-800 font-semibold">오류가 발생했습니다</h3>
                <p className="text-red-600 text-sm mt-1">{error.message}</p>
              </div>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">쿠폰 관리</h1>
          <button
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="bg-primary-800 text-white px-4 py-2 rounded-lg hover:bg-primary-900 transition"
          >
            + 쿠폰 생성
          </button>
        </div>

        <CouponTable
          coupons={coupons}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
          onDelete={handleDeleteSubmit}
          onIssueWithConditions={handleIssueWithConditionsClick}
          onIssueToAll={handleIssueToAllClick}
        />

        <CouponFormModal
          isOpen={showCreateModal}
          editingCoupon={editingCoupon}
          formData={formData}
          onClose={() => {
            resetForm()
                    setShowCreateModal(false)
          }}
          onSubmit={editingCoupon ? handleUpdateSubmit : handleCreateSubmit}
          onFormDataChange={setFormData}
        />

        <CouponIssueModal
          isOpen={showIssueModal}
          coupon={selectedCoupon}
          conditions={issueConditions}
          onClose={() => {
            resetConditions()
                    setShowIssueModal(false)
          }}
          onSubmit={handleIssueWithConditionsSubmit}
          onConditionsChange={setIssueConditions}
        />
      </div>
    </div>
  )
}
