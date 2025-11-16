'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type AdminReview = {
  id: string
  product_id: string
  order_id: string
  user_id: string
  rating: number
  title?: string | null
  content: string
  images: string[]
  status?: 'pending' | 'approved' | 'rejected'
  created_at: string
  user_name?: string
  product?: {
    name: string
    image_url: string
    brand?: string
  } | null
  admin_reply?: string | null
  admin_replied_at?: string | null
}

export default function AdminReviewsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'pending'|'approved'|'rejected'>('pending')
  const [loading, setLoading] = useState(false)
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [updatingId, setUpdatingId] = useState<string|null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({})
  const [pointsDrafts, setPointsDrafts] = useState<Record<string, string>>({})

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reviews?status=${status}&page=${page}&limit=20`, { cache: 'no-store' })
      if (res.status === 401) {
        alert('관리자 로그인이 필요합니다.')
        router.replace('/admin/login')
        return
      }
      const data = await res.json()
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      // 기본 포인트 값을 이미지 유무에 따라 초기화 (사진 500, 텍스트 200)
      const defaults: Record<string, number> = {}
      const draftDefaults: Record<string, string> = {}
      ;(data.reviews || []).forEach((r: AdminReview) => {
        const hasImages = Array.isArray(r.images) && r.images.length > 0
        defaults[r.id] = hasImages ? 500 : 200
        draftDefaults[r.id] = '' // 입력 전에는 비워둠 (0이 자동 표시되지 않도록)
      })
      setPointsMap(defaults)
      setPointsDrafts(draftDefaults)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page])

  const changeStatus = async (id: string, next: 'approved'|'rejected') => {
    if (!confirm(`리뷰를 ${next === 'approved' ? '승인' : '반려'}하시겠습니까?`)) return
    setUpdatingId(id)
    try {
      const payload: any = { status: next }
      if (next === 'approved') {
        // 우선 입력 필드 값 사용, 비어있으면 기본값 사용
        const str = (pointsDrafts[id] ?? '').trim()
        const parsed = str === '' ? NaN : parseInt(str, 10)
        const hasImages = (reviews.find(r => r.id === id)?.images || []).length > 0
        const fallback = hasImages ? 500 : 200
        const chosen = Number.isNaN(parsed) ? fallback : Math.max(0, parsed)
        payload.points = chosen
      }
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '처리에 실패했습니다.')
        return
      }
      await fetchReviews()
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteReview = async (id: string) => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '삭제에 실패했습니다.')
        return
      }
      await fetchReviews()
    } finally {
      setUpdatingId(null)
    }
  }

  const saveReply = async (id: string) => {
    const text = replyDrafts[id] ?? ''
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: text })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '답변 저장에 실패했습니다.')
        return
      }
      await fetchReviews()
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteReply = async (id: string) => {
    if (!confirm('관리자 답변을 삭제하시겠습니까?')) return
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteReply: true })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '답변 삭제에 실패했습니다.')
        return
      }
      await fetchReviews()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold">리뷰 관리</h1>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-sm"
              value={status}
              onChange={(e)=>{ setPage(1); setStatus(e.target.value as any) }}
            >
              <option value="pending">대기</option>
              <option value="approved">승인</option>
              <option value="rejected">반려</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 py-8">불러오는 중...</div>
        ) : reviews.length === 0 ? (
          <div className="text-sm text-gray-500 py-8">표시할 리뷰가 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border rounded p-4">
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-900 font-semibold truncate">{r.product?.name || '상품'}</div>
                      <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {r.user_name || r.user_id} · 별점 {r.rating}
                    </div>
                    {r.title && <div className="text-sm font-medium mt-2">{r.title}</div>}
                    <div className="text-sm mt-1 whitespace-pre-wrap">{r.content}</div>
                    {Array.isArray(r.images) && r.images.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {r.images.slice(0, 5).map((img, idx) => (
                          <div key={idx} className="w-16 h-16 rounded overflow-hidden bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 승인 시 포인트 설정 (대기/반려 상태에서만 노출) */}
                    {status !== 'approved' && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-xs text-gray-600">지급 포인트</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pointsDrafts[r.id] ?? ''}
                        placeholder={(Array.isArray(r.images) && r.images.length > 0 ? '500' : '200')}
                        onChange={(e)=> {
                          const digits = e.target.value.replace(/[^0-9]/g, '')
                          setPointsDrafts(prev => ({ ...prev, [r.id]: digits }))
                        }}
                        onBlur={() => {
                          const raw = (pointsDrafts[r.id] ?? '').trim()
                          if (raw === '') return
                          const parsed = parseInt(raw, 10) || 0
                          setPointsMap(prev => ({ ...prev, [r.id]: Math.max(0, parsed) }))
                        }}
                        className="w-28 px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    )}
                    {/* 관리자 답변 */}
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-600">
                          관리자 답변 {r.admin_replied_at ? `· ${new Date(r.admin_replied_at).toLocaleString()}` : ''}
                        </div>
                        {r.admin_reply && (
                          <button
                            onClick={() => deleteReply(r.id)}
                            disabled={updatingId === r.id}
                            className="text-xs text-red-600 hover:underline disabled:opacity-60"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      <textarea
                        value={replyDrafts[r.id] ?? (r.admin_reply || '')}
                        onChange={(e)=>setReplyDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                        rows={3}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="관리자 답변을 입력하세요"
                      />
                      <div className="mt-2 text-right">
                        <button
                          onClick={() => saveReply(r.id)}
                          disabled={updatingId === r.id}
                          className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {updatingId === r.id ? '저장 중...' : '답변 저장'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {status !== 'approved' && (
                        <button
                          onClick={() => changeStatus(r.id, 'approved')}
                          disabled={updatingId === r.id}
                          className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          {updatingId === r.id ? '처리 중...' : '승인(포인트 지급)'}
                        </button>
                      )}
                      {status !== 'rejected' && (
                        <button
                          onClick={() => changeStatus(r.id, 'rejected')}
                          disabled={updatingId === r.id}
                          className="px-3 py-1.5 text-xs rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-60"
                        >
                          {updatingId === r.id ? '처리 중...' : '반려'}
                        </button>
                      )}
                      <button
                        onClick={() => deleteReview(r.id)}
                        disabled={updatingId === r.id}
                        className="px-3 py-1.5 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              총 <span className="font-semibold">{total}</span>건
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                ‹
              </button>
              <span className="text-sm">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


