import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'
import { User, UserPoints, PointFormData, SelectedUserSummary } from '../_types'

export function useAdminPoints() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [userPoints, setUserPoints] = useState<Record<string, UserPoints>>({})
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<PointFormData>({
    points: '',
    pointType: 'purchase',
    notificationTitle: '',
    notificationContent: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminApiFetch('/api/admin/users')
      
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
        const pointsResponse = await adminApiFetch('/api/admin/points/list')
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
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUserList = useMemo(() => {
    return users.filter(user => {
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      return (
        user.email.toLowerCase().includes(term) ||
        user.name.toLowerCase().includes(term) ||
        user.phone.includes(term)
      )
    })
  }, [users, searchTerm])

  const handleUserSelect = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      } else {
        return [...prev, userId]
      }
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    setSelectedUsers(prev => {
      const filteredUserIds = filteredUserList.map(u => u.id)
      if (prev.length === filteredUserIds.length && 
          filteredUserIds.every(id => prev.includes(id))) {
        return []
      } else {
        return filteredUserIds
      }
    })
  }, [filteredUserList])

  const updateFormField = useCallback(<K extends keyof PointFormData>(
    field: K,
    value: PointFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (selectedUsers.length === 0) {
      toast.error('적립할 고객을 선택해주세요.', { duration: 3000 })
      return false
    }

    const pointsNum = parseInt(formData.points)
    if (isNaN(pointsNum) || pointsNum <= 0) {
      toast.error('유효한 포인트를 입력해주세요.')
      return false
    }

    if (!formData.notificationTitle.trim() || !formData.notificationContent.trim()) {
      toast.error('알림 제목과 내용을 입력해주세요.', { duration: 3000 })
      return false
    }

    setIsSubmitting(true)
    try {
      const response = await adminApiFetch('/api/admin/points/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: selectedUsers,
          points: pointsNum,
          point_type: formData.pointType,
          notification_title: formData.notificationTitle,
          notification_content: formData.notificationContent,
        }),
      })

      if (response.status === 401) {
        router.push('/admin/login?next=/admin/points')
        return false
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '포인트 적립 실패')
      }

      toast.success(`${selectedUsers.length}명에게 ${pointsNum.toLocaleString()}포인트가 적립되었습니다.`, {
        duration: 3000,
      })

      // 폼 초기화
      setSelectedUsers([])
      setFormData({
        points: '',
        pointType: 'purchase',
        notificationTitle: '',
        notificationContent: '',
      })

      // 포인트 정보 새로고침
      await fetchUsers()
      return true
    } catch (error: any) {
      console.error('포인트 적립 실패:', error)
      toast.error(error.message || '포인트 적립에 실패했습니다.', { duration: 3000 })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedUsers, formData, router, fetchUsers])

  // 통계 계산
  const totalUserCount = users.length
  const selectedUserCount = selectedUsers.length
  const allUsersTotalPoints = Object.values(userPoints).reduce((sum, p) => sum + p.total_points, 0)
  const selectedUsersTotalPoints = selectedUsers.reduce((sum, userId) => {
    return sum + (userPoints[userId]?.total_points || 0)
  }, 0)

  // 선택된 사용자 요약 정보 (PointForm에 전달)
  const selectedUserSummaries = useMemo<SelectedUserSummary[]>(() => {
    return selectedUsers
      .map(userId => {
        const user = users.find(u => u.id === userId)
        const points = userPoints[userId]
        if (!user) return null
        return {
          id: userId,
          name: user.name || '이름 없음',
          totalPoints: points?.total_points || 0,
        }
      })
      .filter((summary): summary is SelectedUserSummary => summary !== null)
  }, [selectedUsers, users, userPoints])

  return {
    users,
    userPoints,
    loading,
    selectedUsers,
    selectedUserSummaries,
    searchTerm,
    setSearchTerm,
    formData,
    isSubmitting,
    filteredUserList,
    totalUserCount,
    selectedUserCount,
    allUsersTotalPoints,
    selectedUsersTotalPoints,
    handleUserSelect,
    handleToggleAll,
    updateFormField,
    handleSubmit,
    fetchUsers,
  }
}

