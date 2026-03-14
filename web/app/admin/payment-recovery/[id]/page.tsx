'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminPageLayout from '../../_components/AdminPageLayout'

type Draft = {
  id: string
  payload: Record<string, unknown>
}

export default function AdminPaymentRecoveryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function fetchDraft() {
      const res = await fetch(`/api/admin/order-drafts/recovery/${id}`)
      const json = await res.json()
      if (cancelled) return
      if (!res.ok) {
        setError(json.error || '조회 실패')
        setLoading(false)
        return
      }
      setDraft(json.draft)
      setLoading(false)
    }
    fetchDraft()
    return () => { cancelled = true }
  }, [id])

  const handleCancelPayment = async () => {
    if (!id || cancelling) return
    if (!confirm('이 결제를 취소하고 환불 처리하시겠습니까?')) return
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/order-drafts/recovery/${id}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || '취소 실패')
        return
      }
      router.push('/admin/payment-recovery')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <AdminPageLayout
      title="결제 복구 · 상세"
      description="승인 후 주문 미생성 draft 상세"
      extra={
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/payment-recovery')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            목록
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            관리자 홈
          </button>
        </div>
      }
    >
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-primary-800" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {draft && !loading && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">주문 스냅샷</h3>
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs max-h-[70vh] overflow-y-auto">
            {JSON.stringify(draft.payload, null, 2)}
          </pre>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCancelPayment}
              disabled={cancelling}
              className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50"
            >
              {cancelling ? '처리 중…' : '결제 취소(환불)'}
            </button>
          </div>
        </div>
      )}
    </AdminPageLayout>
  )
}
