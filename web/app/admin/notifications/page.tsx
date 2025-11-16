'use client'

import { useEffect, useState } from 'react'

type AdminOrder = {
  id: string
  user_id: string
  order_number?: string | null
  updated_at: string
  status: string
  is_confirmed?: boolean
  shipping_name?: string
  shipping_phone?: string
}

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<'confirm'|'review'>('confirm')
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sending, setSending] = useState(false)

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/notifications/candidates?type=${tab}`, { cache: 'no-store' })
      if (res.status === 401) {
        alert('관리자 로그인이 필요합니다.')
        return
      }
      const data = await res.json()
      setOrders(data.orders || [])
      setSelected({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCandidates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {}
    orders.forEach(o => { next[o.id] = checked })
    setSelected(next)
  }

  const sendNow = async () => {
    const orderIds = Object.keys(selected).filter(id => selected[id])
    if (orderIds.length === 0) {
      alert('선택된 주문이 없습니다.')
      return
    }
    if (!confirm(`${tab === 'confirm' ? '구매확정 안내' : '리뷰 요청'}를 ${orderIds.length}건 발송하시겠습니까?`)) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, orderIds })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || '처리에 실패했습니다.')
        return
      }
      alert('발송 처리 완료')
      await fetchCandidates()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold">알림 발송</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('confirm')}
              className={`px-3 py-1.5 text-sm rounded ${tab==='confirm' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-800'}`}
            >
              구매확정 안내 (어제 배송완료)
            </button>
            <button
              onClick={() => setTab('review')}
              className={`px-3 py-1.5 text-sm rounded ${tab==='review' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-800'}`}
            >
              리뷰 요청 (어제 구매확정)
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">
            {tab === 'confirm' ? '어제 배송완료된 주문 목록입니다.' : '어제 구매확정된 주문 목록입니다.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="px-3 py-1.5 text-xs border rounded"
            >
              전체선택
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="px-3 py-1.5 text-xs border rounded"
            >
              선택해제
            </button>
            <button
              onClick={sendNow}
              disabled={sending}
              className="px-4 py-2 text-sm rounded bg-primary-800 text-white hover:bg-primary-900 disabled:opacity-60"
            >
              {sending ? '발송 중...' : (tab === 'confirm' ? '구매확정 안내 발송' : '리뷰 요청 발송')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 py-8">불러오는 중...</div>
        ) : orders.length === 0 ? (
          <div className="text-sm text-gray-500 py-8">대상 주문이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && orders.every(o => selected[o.id])}
                      onChange={(e)=>toggleAll(e.target.checked)}
                    />
                  </th>
                  <th className="p-2 border">주문번호</th>
                  <th className="p-2 border">상태</th>
                  <th className="p-2 border">구매확정</th>
                  <th className="p-2 border">수정일시</th>
                  <th className="p-2 border">수령인</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="p-2 border text-center">
                      <input
                        type="checkbox"
                        checked={!!selected[o.id]}
                        onChange={(e)=>setSelected(prev => ({ ...prev, [o.id]: e.target.checked }))}
                      />
                    </td>
                    <td className="p-2 border">{o.order_number || o.id}</td>
                    <td className="p-2 border">{o.status}</td>
                    <td className="p-2 border">{tab === 'review' ? 'Y' : 'N'}</td>
                    <td className="p-2 border">{new Date(o.updated_at).toLocaleString()}</td>
                    <td className="p-2 border">{o.shipping_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


