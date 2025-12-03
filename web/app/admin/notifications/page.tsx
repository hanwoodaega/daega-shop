'use client'

import { useEffect, useState } from 'react'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type User = {
  id: string
  email?: string
  name?: string
  phone?: string
}

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('general')
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 사용자 목록 조회
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      if (res.status === 401) {
        alert('관리자 로그인이 필요합니다.')
        return
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('사용자 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // 사용자 선택/해제
  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  // 전체 선택/해제
  const toggleAll = (checked: boolean) => {
    if (checked) {
      const filtered = getFilteredUsers()
      setSelectedUserIds(new Set(filtered.map(u => u.id)))
    } else {
      setSelectedUserIds(new Set())
    }
  }

  // 필터링된 사용자 목록
  const getFilteredUsers = () => {
    if (!searchQuery.trim()) {
      return users
    }
    const query = searchQuery.toLowerCase()
    return users.filter(u => 
      u.email?.toLowerCase().includes(query) ||
      u.name?.toLowerCase().includes(query) ||
      u.phone?.includes(query)
    )
  }

  // 알림 발송
  const sendNotifications = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }

    if (selectedUserIds.size === 0) {
      alert('수신자를 선택해주세요.')
      return
    }

    if (!confirm(`${selectedUserIds.size}명에게 알림을 발송하시겠습니까?`)) {
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/admin/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          type,
          user_ids: Array.from(selectedUserIds)
        })
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '알림 발송에 실패했습니다.')
        return
      }

      alert(`알림이 ${data.count}건 발송되었습니다.`)
      
      // 폼 초기화
      setTitle('')
      setContent('')
      setType('general')
      setSelectedUserIds(new Set())
    } catch (error) {
      console.error('알림 발송 실패:', error)
      alert('알림 발송 중 오류가 발생했습니다.')
    } finally {
      setSending(false)
    }
  }

  const filteredUsers = getFilteredUsers()
  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id))

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">알림 발송</h1>

        {/* 알림 작성 폼 */}
        <div className="mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="알림 제목을 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용 *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="알림 내용을 입력하세요"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              알림 유형
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
            >
              <option value="general">일반</option>
              <option value="point">적립</option>
              <option value="review">리뷰</option>
            </select>
          </div>
        </div>

        {/* 수신자 선택 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">수신자 선택</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이메일, 이름, 전화번호로 검색..."
                className="px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => toggleAll(true)}
                className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
              >
                전체선택
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
              >
                선택해제
              </button>
            </div>
          </div>

          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center text-gray-500 py-8">불러오는 중...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-gray-500 py-8">사용자가 없습니다.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 border text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </th>
                    <th className="p-2 border text-left">이메일</th>
                    <th className="p-2 border text-left">이름</th>
                    <th className="p-2 border text-left">전화번호</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedUserIds.has(user.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => toggleUser(user.id)}
                    >
                      <td className="p-2 border">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => toggleUser(user.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="p-2 border">{user.email || '-'}</td>
                      <td className="p-2 border">{user.name || '-'}</td>
                      <td className="p-2 border">{user.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-2 text-sm text-gray-600">
            선택된 수신자: <span className="font-semibold">{selectedUserIds.size}명</span>
          </div>
        </div>

        {/* 발송 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={sendNotifications}
            disabled={sending || !title.trim() || !content.trim() || selectedUserIds.size === 0}
            className="px-6 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? '발송 중...' : '알림 발송'}
          </button>
        </div>
      </div>
    </div>
  )
}
