import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'
import { User, NotificationType, NotificationFormData } from '../_types'

export function useNotifications() {
  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    content: '',
    type: 'general'
  })
  
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const updateField = useCallback(
    <K extends keyof NotificationFormData>(
      field: K,
      value: NotificationFormData[K]
    ) => {
      setFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await adminApiFetch('/api/admin/users', { cache: 'no-store' })
      if (res.status === 401) {
        // Auth error should be handled by a global interceptor or parent component,
        // but for now, we just stop loading and clear users.
        setUsers([])
        return
      }
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      } else {
        toast.error(data.error || '사용자 정보를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('사용자 조회 실패:', error)
      toast.error('사용자 정보를 불러오는데 실패했습니다.', { duration: 3000 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users
    }
    const query = searchQuery.trim().toLowerCase()
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.signup_method?.toLowerCase().includes(query) ||
        (u.phone && u.phone.replace(/\s/g, '').includes(query.replace(/\s/g, '')))
    )
  }, [users, searchQuery])

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

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)))
    } else {
      setSelectedUserIds(new Set())
    }
  }

  const sendNotifications = async () => {
    const { title, content, type } = formData
    
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.', { duration: 3000 })
      return false
    }

    if (selectedUserIds.size === 0) {
      toast.error('수신자를 선택해주세요.', { duration: 3000 })
      return false
    }

    setSending(true)
    try {
      const res = await adminApiFetch('/api/admin/notifications/create', {
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
        toast.error(data.error || '알림 발송에 실패했습니다.', { duration: 3000 })
        return false
      }

      toast.success(`알림이 ${data.count}건 발송되었습니다.`, { duration: 2000 })
      
      // 폼 초기화
      setFormData({
        title: '',
        content: '',
        type: 'general'
      })
      setSelectedUserIds(new Set())
      return true
    } catch (error) {
      console.error('알림 발송 실패:', error)
      toast.error('알림 발송 중 오류가 발생했습니다.', { duration: 3000 })
      return false
    } finally {
      setSending(false)
    }
  }

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id))

  return {
    formData,
    updateField,
    users,
    selectedUserIds,
    loading,
    sending,
    searchQuery, setSearchQuery,
    filteredUsers,
    allSelected,
    toggleUser,
    toggleAll,
    sendNotifications
  }
}

