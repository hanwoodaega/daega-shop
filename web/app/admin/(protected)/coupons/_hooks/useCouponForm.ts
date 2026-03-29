import { useState } from 'react'
import toast from 'react-hot-toast'
import { Coupon } from '@/lib/supabase/supabase'
import { CouponFormData } from '../_types'
import { validateCouponForm } from '../_utils/validation'

const initialFormData: CouponFormData = {
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_purchase_amount: '',
  max_discount_amount: '',
  validity_days: '',
  issue_trigger: 'ADMIN',
}

export function useCouponForm() {
  const [formData, setFormData] = useState<CouponFormData>(initialFormData)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

  const resetForm = () => {
    setFormData(initialFormData)
    setEditingCoupon(null)
  }

  const setEditing = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase_amount: coupon.min_purchase_amount || '',
      max_discount_amount: coupon.max_discount_amount || '',
      validity_days: coupon.validity_days || '',
      issue_trigger: coupon.issue_trigger || 'ADMIN',
    })
  }

  const handleCreate = async (): Promise<{ success: boolean; error?: { status: number; message: string } }> => {
    const validation = validateCouponForm(formData)
    if (!validation.isValid) {
      toast.error(validation.error || '입력값을 확인해주세요.', { duration: 3000 })
      return { success: false }
    }

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validation.data,
          is_active: true,
        }),
      })

      if (res.status === 401) {
        return { success: false, error: { status: 401, message: '인증이 필요합니다.' } }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '쿠폰 생성에 실패했습니다.')
      }

      toast.success('쿠폰이 생성되었습니다.', { duration: 2000 })
      return { success: true }
    } catch (error: any) {
      console.error('쿠폰 생성 실패:', error)
      toast.error(error.message || '쿠폰 생성에 실패했습니다.', { duration: 3000 })
      return { success: false, error: { status: 500, message: error.message || '쿠폰 생성에 실패했습니다.' } }
    }
  }

  const handleUpdate = async (): Promise<{ success: boolean; error?: { status: number; message: string } }> => {
    if (!editingCoupon) return { success: false }

    const validation = validateCouponForm(formData)
    if (!validation.isValid) {
      toast.error(validation.error || '입력값을 확인해주세요.', { duration: 3000 })
      return { success: false }
    }

    try {
      const res = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      })

      if (res.status === 401) {
        return { success: false, error: { status: 401, message: '인증이 필요합니다.' } }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '쿠폰 수정에 실패했습니다.')
      }

      toast.success('쿠폰이 수정되었습니다.', { duration: 2000 })
      return { success: true }
    } catch (error: any) {
      console.error('쿠폰 수정 실패:', error)
      toast.error(error.message || '쿠폰 수정에 실패했습니다.', { duration: 3000 })
      return { success: false, error: { status: 500, message: error.message || '쿠폰 수정에 실패했습니다.' } }
    }
  }

  const handleDelete = async (couponId: string): Promise<{ success: boolean; error?: { status: number; message: string } }> => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return { success: false }

    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
      })

      if (res.status === 401) {
        return { success: false, error: { status: 401, message: '인증이 필요합니다.' } }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '쿠폰 삭제에 실패했습니다.')
      }

      toast.success('쿠폰이 삭제되었습니다.', { duration: 2000 })
      return { success: true }
    } catch (error: any) {
      console.error('쿠폰 삭제 실패:', error)
      toast.error(error.message || '쿠폰 삭제에 실패했습니다.', { duration: 3000 })
      return { success: false, error: { status: 500, message: error.message || '쿠폰 삭제에 실패했습니다.' } }
    }
  }

  const toggleActive = async (coupon: Coupon): Promise<{ success: boolean; error?: { status: number; message: string } }> => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !coupon.is_active,
        }),
      })

      if (res.status === 401) {
        return { success: false, error: { status: 401, message: '인증이 필요합니다.' } }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '쿠폰 상태 변경에 실패했습니다.')
      }

      toast.success(`쿠폰이 ${!coupon.is_active ? '활성화' : '비활성화'}되었습니다.`, { duration: 2000 })
      return { success: true }
    } catch (error: any) {
      console.error('쿠폰 상태 변경 실패:', error)
      toast.error(error.message || '쿠폰 상태 변경에 실패했습니다.', { duration: 3000 })
      return { success: false, error: { status: 500, message: error.message || '쿠폰 상태 변경에 실패했습니다.' } }
    }
  }

  return {
    formData,
    setFormData,
    editingCoupon,
    setEditing,
    resetForm,
    handleCreate,
    handleUpdate,
    handleDelete,
    toggleActive,
  }
}

