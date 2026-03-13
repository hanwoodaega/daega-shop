'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminPageLayout from '../_components/AdminPageLayout'

type RecoveryItem = {
  id: string
  amount: number
  tax_free_amount: number
  toss_payment_key: string
  toss_approved_at: string | null
  confirm_status: string
  orderer_name: string
  orderer_phone: string
  created_at: string
}

export default function AdminPaymentRecoveryPage() {
  const router = useRouter()
  const [items, setItems] = useState<RecoveryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchList() {
      const res = await fetch('/api/admin/order-drafts/recovery')
      if (!res.ok || cancelled) return
      const json = await res.json()
      if (!cancelled && json.items) setItems(json.items)
      setLoading(false)
    }
    fetchList()
    return () => { cancelled = true }
  }, [])

  const formatDate = (s: string | null) => {
    if (!s) return '-'
    const d = new Date(s)
    return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
  }

  const formatAmount = (n: number) => `${n.toLocaleString()}원`

  return (
    <AdminPageLayout
      title="결제 복구"
      description="승인 후 주문 미생성 · 미처리 결제 이상건 (일반 주문 목록과 분리)"
      extra={
        <button
          onClick={() => router.push('/admin')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          관리자 홈
        </button>
      }
    >
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h2 className="text-lg font-semibold text-amber-900">결제 복구 필요</h2>
        <p className="text-sm text-amber-800 mt-1">
          승인 후 주문 미생성 · 토스 결제는 완료됐으나 DB 주문 생성이 실패한 건만 표시됩니다.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-primary-800" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          미처리 결제 이상건이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700">Draft ID</th>
                <th className="px-4 py-3 font-semibold text-gray-700">결제 승인 시각</th>
                <th className="px-4 py-3 font-semibold text-gray-700">결제금액</th>
                <th className="px-4 py-3 font-semibold text-gray-700">주문자명 / 연락처</th>
                <th className="px-4 py-3 font-semibold text-gray-700">toss_payment_key</th>
                <th className="px-4 py-3 font-semibold text-gray-700">confirm_status</th>
                <th className="px-4 py-3 font-semibold text-gray-700">동작</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(row.toss_approved_at)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatAmount(row.amount)}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.orderer_name || '-'} / {row.orderer_phone || '-'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[180px] truncate" title={row.toss_payment_key}>
                    {row.toss_payment_key || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      {row.confirm_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/admin/payment-recovery/${row.id}`)}
                      className="text-primary-700 font-medium hover:underline"
                    >
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageLayout>
  )
}
