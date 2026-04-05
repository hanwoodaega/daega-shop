'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'

export type AdminNotificationRow = {
  id: string
  user_id: string
  title: string
  content: string
  type: string
  is_read: boolean
  created_at: string
  recipient_name: string | null
  recipient_phone: string | null
}

function kstDateInputValue(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

interface NotificationDayHistoryProps {
  refreshTrigger?: number
}

export default function NotificationDayHistory({ refreshTrigger = 0 }: NotificationDayHistoryProps) {
  const [date, setDate] = useState(() => kstDateInputValue(new Date()))
  const [items, setItems] = useState<AdminNotificationRow[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApiFetch(`/api/admin/notifications?date=${encodeURIComponent(date)}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '알림 내역을 불러오지 못했습니다.')
        setItems([])
        return
      }
      setItems(data.notifications || [])
    } catch {
      toast.error('알림 내역을 불러오지 못했습니다.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    void load()
  }, [load, refreshTrigger])

  return (
    <section className="mt-10 pt-8 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">알림 발송 내역 (일별)</h2>
          <p className="text-sm text-gray-500 mt-1">
            선택한 날짜(한국 시간 기준)에 생성된 알림을 모두 표시합니다. 주문·리뷰 등 시스템 알림도 포함됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="notif-history-date" className="text-sm text-gray-600 whitespace-nowrap">
            날짜
          </label>
          <input
            id="notif-history-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            새로고침
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12 border rounded-lg">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border rounded-lg bg-gray-50">
          이 날짜에 생성된 알림이 없습니다.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-3">
            총 <span className="font-semibold text-gray-900">{items.length}</span>건
          </p>
          <div className="border rounded-lg overflow-hidden max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 border-b text-left font-medium text-gray-700">시간</th>
                  <th className="p-2 border-b text-left font-medium text-gray-700">수신자</th>
                  <th className="p-2 border-b text-left font-medium text-gray-700">유형</th>
                  <th className="p-2 border-b text-left font-medium text-gray-700">제목</th>
                  <th className="p-2 border-b text-left font-medium text-gray-700">내용</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50 align-top">
                    <td className="p-2 border-b text-gray-600 whitespace-nowrap">
                      {new Date(n.created_at).toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </td>
                    <td className="p-2 border-b text-gray-800">
                      <div>{n.recipient_name || '—'}</div>
                      <div className="text-xs text-gray-500">
                        {n.recipient_phone || `id: ${n.user_id.slice(0, 8)}…`}
                      </div>
                    </td>
                    <td className="p-2 border-b text-gray-700 whitespace-nowrap">{n.type}</td>
                    <td className="p-2 border-b font-medium text-gray-900 max-w-[180px]">{n.title}</td>
                    <td className="p-2 border-b text-gray-700 max-w-md">
                      <p className="line-clamp-3 whitespace-pre-wrap break-words">{n.content}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
