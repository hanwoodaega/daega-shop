'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { convertLocalToISO, convertUTCToLocal } from '@/lib/utils/time-utils'
import type { TimeDeal, TimeDealFormData } from '../_types'

export function useAdminTimeDeals() {
  const router = useRouter()
  const [timeDeals, setTimeDeals] = useState<TimeDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeDeal, setSelectedTimeDeal] = useState<TimeDeal | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTimeDeal, setEditingTimeDeal] = useState<TimeDeal | null>(null)
  const [formData, setFormData] = useState<TimeDealFormData>({
    title: '',
    description: '',
    start_at: '',
    end_at: '',
  })

  const fetchTimeDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/timedeals')
      const data = await res.json()
      if (res.ok) {
        setTimeDeals(data.timedeals || [])
      } else {
        toast.error('타임딜 조회에 실패했습니다')
      }
    } catch (error) {
      console.error('타임딜 조회 실패:', error)
      toast.error('타임딜 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTimeDeals()
  }, [fetchTimeDeals])

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      start_at: '',
      end_at: '',
    })
    setEditingTimeDeal(null)
  }, [])

  const openCreateModal = useCallback(() => {
    resetForm()
    setShowCreateModal(true)
  }, [resetForm])

  const openEditModal = useCallback((timeDeal: TimeDeal) => {
    setEditingTimeDeal(timeDeal)
    setFormData({
      title: timeDeal.title,
      description: timeDeal.description || '',
      start_at: convertUTCToLocal(timeDeal.start_at),
      end_at: convertUTCToLocal(timeDeal.end_at),
    })
    setShowCreateModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowCreateModal(false)
    resetForm()
  }, [resetForm])

  const updateFormField = useCallback(
    <K extends keyof TimeDealFormData>(field: K, value: TimeDealFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const getDefaultStartAt = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }, [])

  const handleCreate = useCallback(async () => {
    if (!formData.title || !formData.end_at) {
      toast.error('제목과 종료 시간은 필수입니다')
      return false
    }

    const startAt = formData.start_at || getDefaultStartAt()

    try {
      const res = await fetch('/api/admin/timedeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          start_at: convertLocalToISO(startAt),
          end_at: convertLocalToISO(formData.end_at),
          products: [],
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('타임딜이 생성되었습니다')
        closeModal()
        await fetchTimeDeals()
        return true
      } else {
        toast.error(data.error || '타임딜 생성에 실패했습니다')
        return false
      }
    } catch (error) {
      console.error('타임딜 생성 실패:', error)
      toast.error('타임딜 생성에 실패했습니다')
      return false
    }
  }, [formData, getDefaultStartAt, closeModal, fetchTimeDeals])

  const handleUpdate = useCallback(async () => {
    if (!editingTimeDeal) return false

    if (!formData.title || !formData.end_at) {
      toast.error('제목과 종료 시간은 필수입니다')
      return false
    }

    const startAt = formData.start_at || getDefaultStartAt()

    try {
      const res = await fetch('/api/admin/timedeals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTimeDeal.id,
          title: formData.title,
          description: formData.description || null,
          start_at: convertLocalToISO(startAt),
          end_at: convertLocalToISO(formData.end_at),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('타임딜이 수정되었습니다')
        closeModal()
        await fetchTimeDeals()
        if (selectedTimeDeal?.id === editingTimeDeal.id) {
          const updated = timeDeals.find((td) => td.id === editingTimeDeal.id)
          if (updated) setSelectedTimeDeal(updated)
        }
        return true
      } else {
        toast.error(data.error || '타임딜 수정에 실패했습니다')
        return false
      }
    } catch (error) {
      console.error('타임딜 수정 실패:', error)
      toast.error('타임딜 수정에 실패했습니다')
      return false
    }
  }, [editingTimeDeal, formData, getDefaultStartAt, closeModal, fetchTimeDeals, selectedTimeDeal, timeDeals])

  const handleDelete = useCallback(
    async (timeDealId: number) => {
      if (!confirm('이 타임딜을 삭제하시겠습니까?')) return false

      try {
        const res = await fetch(`/api/admin/timedeals?id=${timeDealId}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          toast.success('타임딜이 삭제되었습니다')
          if (selectedTimeDeal?.id === timeDealId) {
            setSelectedTimeDeal(null)
          }
          await fetchTimeDeals()
          return true
        } else {
          const data = await res.json()
          toast.error(data.error || '타임딜 삭제에 실패했습니다')
          return false
        }
      } catch (error) {
        console.error('타임딜 삭제 실패:', error)
        toast.error('타임딜 삭제에 실패했습니다')
        return false
      }
    },
    [selectedTimeDeal, fetchTimeDeals]
  )

  const isActive = useCallback((timeDeal: TimeDeal) => {
    const now = new Date()
    const start = new Date(timeDeal.start_at)
    const end = new Date(timeDeal.end_at)
    return now >= start && now <= end
  }, [])

  return {
    timeDeals,
    loading,
    selectedTimeDeal,
    showCreateModal,
    editingTimeDeal,
    formData,
    setSelectedTimeDeal,
    openCreateModal,
    openEditModal,
    closeModal,
    updateFormField,
    handleCreate,
    handleUpdate,
    handleDelete,
    isActive,
    refetch: fetchTimeDeals,
  }
}

