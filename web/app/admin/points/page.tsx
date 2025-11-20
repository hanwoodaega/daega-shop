'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils'

interface User {
  id: string
  email: string
  name: string
  phone: string
}

interface UserPoints {
  user_id: string
  total_points: number
  purchase_count: number
}

export default function AdminPointsPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [userPoints, setUserPoints] = useState<Record<string, UserPoints>>({})
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [points, setPoints] = useState('')
  const [pointType, setPointType] = useState<'purchase' | 'review'>('purchase')
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationContent, setNotificationContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users')
      
      if (response.status === 401) {
        router.push('/admin/login?next=/admin/points')
        return
      }

      const data = await response.json()
      
      if (!response.ok) {
        const errorMessage = data.error || '사용자 조회 실패'
        throw new Error(errorMessage)
      }
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      if (!data.users) {
        throw new Error('사용자 데이터가 없습니다.')
      }
      
      setUsers(data.users || [])

      // 각 사용자의 포인트 정보 조회
      if (data.users && data.users.length > 0) {
        // 포인트 정보는 서버에서 조회 (관리자 권한 필요)
        const pointsResponse = await fetch('/api/admin/points/list')
        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json()
          const pointsMap: Record<string, UserPoints> = {}
          if (pointsData.points) {
            pointsData.points.forEach((p: any) => {
              pointsMap[p.user_id] = {
                user_id: p.user_id,
                total_points: p.total_points || 0,
                purchase_count: p.purchase_count || 0,
              }
            })
          }
          setUserPoints(pointsMap)
        } else {
          console.warn('포인트 정보 조회 실패:', pointsResponse.status)
        }
      }
    } catch (error: any) {
      console.error('사용자 조회 실패:', error)
      const errorMessage = error.message || '사용자 조회에 실패했습니다.'
      toast.error(errorMessage, {
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      } else {
        return [...prev, userId]
      }
    })
  }

  const handleSelectAll = () => {
    const filteredUsers = filteredUserList
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedUsers.length === 0) {
      toast.error('적립할 고객을 선택해주세요.')
      return
    }

    const pointsNum = parseInt(points)
    if (isNaN(pointsNum) || pointsNum <= 0) {
      toast.error('유효한 포인트를 입력해주세요.')
      return
    }

    if (!notificationTitle.trim() || !notificationContent.trim()) {
      toast.error('알림 제목과 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/points/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: selectedUsers,
          points: pointsNum,
          point_type: pointType,
          notification_title: notificationTitle,
          notification_content: notificationContent,
        }),
      })

      if (response.status === 401) {
        router.push('/admin/login?next=/admin/points')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '포인트 적립 실패')
      }

      toast.success(`${selectedUsers.length}명에게 ${pointsNum.toLocaleString()}포인트가 적립되었습니다.`, {
        icon: '✅',
        duration: 5000,
      })

      // 폼 초기화
      setSelectedUsers([])
      setPoints('')
      setPointType('purchase')
      setNotificationTitle('')
      setNotificationContent('')

      // 포인트 정보 새로고침
      await fetchUsers()
    } catch (error: any) {
      console.error('포인트 적립 실패:', error)
      toast.error(error.message || '포인트 적립에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredUserList = users.filter(user => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      user.email.toLowerCase().includes(term) ||
      user.name.toLowerCase().includes(term) ||
      user.phone.includes(term)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin')}
              className="mr-3 p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">포인트 관리</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            관리자 홈
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 고객 선택 영역 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">고객 선택</h2>
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary-800 hover:text-primary-900 font-medium"
              >
                {selectedUsers.length === filteredUserList.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>

            {/* 검색 */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="이메일, 이름, 전화번호로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* 고객 목록 */}
            <div className="border border-gray-200 rounded-lg max-h-[600px] overflow-y-auto">
              {filteredUserList.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? '검색 결과가 없습니다.' : '고객이 없습니다.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredUserList.map((user) => {
                    const points = userPoints[user.id]
                    return (
                      <label
                        key={user.id}
                        className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleUserSelect(user.id)}
                          className="w-4 h-4 text-primary-800 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.name || '이름 없음'}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary-900">
                                {points ? `${points.total_points.toLocaleString()}P` : '0P'}
                              </p>
                              <p className="text-xs text-gray-500">
                                구매 {points?.purchase_count || 0}회
                              </p>
                            </div>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 포인트 적립 폼 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">포인트 적립</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  선택된 고객
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900 font-semibold">
                    {selectedUsers.length}명
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  적립 포인트 *
                </label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  min="1"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="포인트 입력"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  포인트 타입 *
                </label>
                <select
                  value={pointType}
                  onChange={(e) => setPointType(e.target.value as 'purchase' | 'review')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="purchase">구매 적립</option>
                  <option value="review">리뷰 적립</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 제목 *
                </label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="예: 포인트 적립 완료"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 내용 *
                </label>
                <textarea
                  value={notificationContent}
                  onChange={(e) => setNotificationContent(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="예: 관리자가 포인트를 적립해주셨습니다."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || selectedUsers.length === 0}
                className="w-full py-3 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '적립 중...' : '포인트 적립하기'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

