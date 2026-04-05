'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import AdminPageLayout from '@/app/admin/_components/AdminPageLayout'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'

type Draft = {
  id: string
  payload: Record<string, unknown>
  confirm_status?: string | null
  amount?: number | null
  tax_free_amount?: number | null
  toss_payment_key?: string | null
  toss_approved_at?: string | null
  created_at?: string | null
}

export default function AdminPaymentRecoveryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function fetchDraft() {
      const res = await adminApiFetch(`/api/admin/order-drafts/recovery/${id}`)
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
      const res = await adminApiFetch(`/api/admin/order-drafts/recovery/${id}/cancel`, { method: 'POST' })
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

  const handleProcess = async () => {
    if (!id || processing) return
    if (!confirm('이 draft로 주문을 생성(재처리)하시겠습니까?')) return
    setProcessing(true)
    setError(null)
    try {
      const res = await adminApiFetch(`/api/admin/order-drafts/recovery/${id}/process`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || '재처리 실패')
        return
      }
      router.push('/admin/payment-recovery')
    } finally {
      setProcessing(false)
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
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 space-y-2">
            <p>
              결제 승인 후 주문이 자동 생성되지 않은 경우 여기서 재처리합니다. 결제 직후 서버가 한 번 확정을 시도한 뒤에도 남은 건은{' '}
              <strong>수동 재처리</strong>가 필요합니다. 만료 draft 정리는 DB/운영 절차로 처리하세요.
            </p>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Draft 요약</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <dt className="text-gray-500 shrink-0">Draft ID</dt>
                <dd className="font-mono text-xs break-all flex-1">{draft.id}</dd>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(draft.id).then(() => toast.success('복사했습니다'))
                  }}
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  복사
                </button>
              </div>
              <div>
                <dt className="text-gray-500">confirm_status</dt>
                <dd className="font-medium">{draft.confirm_status ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">금액</dt>
                <dd>
                  {draft.amount != null ? `${Number(draft.amount).toLocaleString()}원` : '-'}
                  {draft.tax_free_amount != null && draft.tax_free_amount > 0 && (
                    <span className="text-gray-500"> (비과세 {Number(draft.tax_free_amount).toLocaleString()}원)</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">toss_payment_key</dt>
                <dd className="font-mono text-xs break-all">{draft.toss_payment_key || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">승인 시각</dt>
                <dd>{draft.toss_approved_at ? new Date(draft.toss_approved_at).toLocaleString('ko-KR') : '-'}</dd>
              </div>
            </dl>
          </div>

          <h3 className="text-sm font-semibold text-gray-700">주문 스냅샷 (payload)</h3>
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs max-h-[70vh] overflow-y-auto">
            {JSON.stringify(draft.payload, null, 2)}
          </pre>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleProcess}
              disabled={processing}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {processing ? '처리 중…' : '재처리(주문 생성)'}
            </button>
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
