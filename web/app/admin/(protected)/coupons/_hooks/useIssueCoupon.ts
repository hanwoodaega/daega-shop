import { useState } from 'react'
import toast from 'react-hot-toast'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'
import { Coupon } from '@/lib/supabase/supabase'
import { IssueConditions } from '../_types'
import { validateIssueConditions } from '../_utils/conditions'

const initialConditions: IssueConditions = {
  phone: '',
}

async function issueCouponRequest(
  body: { coupon_id: string; conditions?: { phone?: string } }
): Promise<{ success: boolean; error?: { status: number; message: string } }> {
  try {
    const res = await adminApiFetch('/api/admin/coupons/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (res.status === 401) {
      return { success: false, error: { status: 401, message: '인증이 필요합니다.' } }
    }

    if (res.ok) {
      toast.success(data.message || '쿠폰이 지급되었습니다.', { duration: 3000 })
      return { success: true }
    }
    toast.error(data.error || '쿠폰 지급에 실패했습니다.', { duration: 3000 })
    return { success: false, error: { status: res.status, message: data.error || '쿠폰 지급에 실패했습니다.' } }
  } catch (error: any) {
    console.error('쿠폰 지급 실패:', error)
    toast.error('쿠폰 지급에 실패했습니다.', { duration: 3000 })
    return { success: false, error: { status: 500, message: '쿠폰 지급에 실패했습니다.' } }
  }
}

export function useIssueCoupon() {
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [issueConditions, setIssueConditions] = useState<IssueConditions>(initialConditions)

  const resetConditions = () => {
    setIssueConditions(initialConditions)
    setSelectedCoupon(null)
  }

  const handleIssueToAll = async (couponId: string): Promise<{ success: boolean; error?: { status: number; message: string } }> => {
    const result = await issueCouponRequest({ coupon_id: couponId })
    if (result.success) resetConditions()
    return result
  }

  const handleIssueByPhone = async (): Promise<{ success: boolean; error?: { status: number; message: string } }> => {
    if (!selectedCoupon) return { success: false }

    const validation = validateIssueConditions(issueConditions)
    if (!validation.isValid) {
      toast.error(validation.error || '전화번호를 확인해주세요.', { duration: 3000 })
      return { success: false }
    }

    const result = await issueCouponRequest({
      coupon_id: selectedCoupon.id,
      conditions: validation.conditions,
    })
    if (result.success) resetConditions()
    return result
  }

  return {
    selectedCoupon,
    setSelectedCoupon,
    issueConditions,
    setIssueConditions,
    resetConditions,
    handleIssueToAll,
    handleIssueByPhone,
  }
}
