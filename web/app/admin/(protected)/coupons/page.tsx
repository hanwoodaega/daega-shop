'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coupon } from '@/lib/supabase/supabase'
import CouponTable from './_components/CouponTable'
import CouponFormModal from './_components/CouponFormModal'
import CouponIssueModal from './_components/CouponIssueModal'
import { useCoupons } from './_hooks/useCoupons'
import { useCouponForm } from './_hooks/useCouponForm'
import { useIssueCoupon } from './_hooks/useIssueCoupon'
import AdminPageLayout from '@/app/admin/_components/AdminPageLayout'

export default function CouponsPage() {
  const router = useRouter()
  const { coupons, loading, error, refetch } = useCoupons()
  const {
    formData,
    setFormData,
    resetForm,
    handleCreate,
    handleDelete,
  } = useCouponForm()
  const {
    selectedCoupon,
    setSelectedCoupon,
    issueConditions,
    setIssueConditions,
    resetConditions,
    handleIssueToAll,
    handleIssueByPhone,
  } = useIssueCoupon()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showIssueModal, setShowIssueModal] = useState(false)

  // useCoupons에서 반환된 에러 처리 (401이면 로그인 페이지로)
  useEffect(() => {
    if (error?.status === 401) {
      router.push('/admin/login?next=/admin/coupons')
    }
  }, [error, router])

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

  const handleDeleteSubmit = async (couponId: string) => {
    const result = await handleDelete(couponId)
    if (result.success) {
      refetch()
    } else if (result.error?.status === 401) {
        router.push('/admin/login?next=/admin/coupons')
    }
  }

  const handleIssueClick = (coupon: Coupon) => {
    setIssueConditions({ phone: '' })
    setSelectedCoupon(coupon)
    setShowIssueModal(true)
  }

  const handleIssueByPhoneSubmit = async () => {
    const result = await handleIssueByPhone()
    if (result.success) {
      setShowIssueModal(false)
      refetch()
    } else if (result.error?.status === 401) {
      router.push('/admin/login?next=/admin/coupons')
    }
  }

  const handleIssueToAllSubmit = async () => {
    if (!selectedCoupon || !confirm('모든 사용자에게 이 쿠폰을 지급하시겠습니까?')) return
    const result = await handleIssueToAll(selectedCoupon.id)
    if (result.success) {
      setShowIssueModal(false)
      refetch()
    } else if (result.error?.status === 401) {
      router.push('/admin/login?next=/admin/coupons')
    }
  }

  if (loading) {
    return (
      <AdminPageLayout title="쿠폰 관리">
        <div className="text-center py-12">로딩 중...</div>
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout 
      title="쿠폰 관리"
      extra={
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className="bg-primary-800 text-white px-4 py-2 rounded-lg hover:bg-primary-900 transition"
        >
          + 쿠폰 생성
        </button>
      }
    >
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

        <CouponTable
          coupons={coupons}
          onDelete={handleDeleteSubmit}
          onIssue={handleIssueClick}
        />

        <CouponFormModal
          isOpen={showCreateModal}
          editingCoupon={null}
          formData={formData}
          onClose={() => {
            resetForm()
            setShowCreateModal(false)
          }}
          onSubmit={handleCreateSubmit}
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
          onIssueByPhone={handleIssueByPhoneSubmit}
          onIssueToAll={handleIssueToAllSubmit}
          onConditionsChange={setIssueConditions}
        />
    </AdminPageLayout>
  )
}
