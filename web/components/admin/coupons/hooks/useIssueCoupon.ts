import { useState } from 'react'
import toast from 'react-hot-toast'
import { Coupon } from '@/lib/supabase'
import { IssueConditions } from '../types'
import { validateIssueConditions } from '../utils/conditions'

const initialConditions: IssueConditions = {
  birthday_month: '',
  min_purchase_amount: '',
  purchase_period_start: '',
  purchase_period_end: '',
  min_purchase_count: '',
  phone: '',
}

// stats 기반 성공 메시지 포맷팅
function formatSuccessMessage(
  stats: { total?: number; filtered?: number; issued: number; skipped: number },
  hasFiltered: boolean = false
): string {
  if (hasFiltered && stats.filtered !== undefined) {
    // 조건별 지급 메시지
    const { filtered, issued, skipped } = stats
    if (issued === 0 && skipped === filtered) {
      return `✅ 전체 발급 완료\n조건에 맞는 사용자: ${filtered}명\n이미 지급된 사용자: ${skipped}명\n추가 발급 수: 0명`
    } else if (issued > 0 && skipped > 0) {
      return `✅ 쿠폰 발급 완료\n조건에 맞는 사용자: ${filtered}명\n추가 발급 수: ${issued}명\n이미 지급된 사용자: ${skipped}명`
    } else if (issued > 0 && skipped === 0) {
      return `✅ 쿠폰 발급 완료\n조건에 맞는 사용자: ${filtered}명\n추가 발급 수: ${issued}명`
    }
  } else if (stats.total !== undefined) {
    // 전체 지급 메시지
    const { total, issued, skipped } = stats
    if (issued === 0 && skipped === total) {
      return `✅ 전체 발급 완료\n이미 지급된 사용자: ${skipped}명\n추가 발급 수: 0명`
    } else if (issued > 0 && skipped > 0) {
      return `✅ 쿠폰 발급 완료\n전체 사용자: ${total}명\n추가 발급 수: ${issued}명\n이미 지급된 사용자: ${skipped}명`
    } else if (issued > 0 && skipped === 0) {
      return `✅ 쿠폰 발급 완료\n전체 사용자: ${total}명\n추가 발급 수: ${issued}명`
    }
  }
  return '쿠폰이 지급되었습니다.'
}

// 공통 쿠폰 발급 요청 처리
async function issueCouponRequest(
  body: { coupon_id: string; conditions?: any }
): Promise<{ success: boolean; error?: { status: number; message: string } }> {
  try {
    const res = await fetch('/api/admin/coupons/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (res.status === 401) {
      return { success: false, error: { status: 401, message: '인증이 필요합니다.' } }
    }

    if (res.ok) {
      // stats 정보를 활용한 상세 메시지
      if (data.stats) {
        const message = formatSuccessMessage(
          data.stats,
          data.stats.filtered !== undefined // filtered가 있으면 조건별 지급
        )
        const multiLine = message.includes('\n')
        toast.success(message, { duration: multiLine ? 6000 : 4000 })
      } else {
        toast.success(data.message || '쿠폰이 지급되었습니다.', { duration: 4000 })
      }
      return { success: true }
    } else {
      toast.error(data.error || '쿠폰 지급에 실패했습니다.')
      return { success: false, error: { status: res.status, message: data.error || '쿠폰 지급에 실패했습니다.' } }
    }
  } catch (error: any) {
    console.error('쿠폰 지급 실패:', error)
    toast.error('쿠폰 지급에 실패했습니다.')
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
    return issueCouponRequest({ coupon_id: couponId })
  }

  const handleIssueWithConditions = async (): Promise<{ success: boolean; error?: { status: number; message: string } }> => {
    if (!selectedCoupon) return { success: false }

    const validation = validateIssueConditions(issueConditions)
    if (!validation.isValid) {
      toast.error(validation.error || '조건을 확인해주세요.')
      return { success: false }
    }

    const result = await issueCouponRequest({
      coupon_id: selectedCoupon.id,
      conditions: validation.conditions,
    })

    if (result.success) {
      resetConditions()
    }

    return result
  }

  return {
    selectedCoupon,
    setSelectedCoupon,
    issueConditions,
    setIssueConditions,
    resetConditions,
    handleIssueToAll,
    handleIssueWithConditions,
  }
}

