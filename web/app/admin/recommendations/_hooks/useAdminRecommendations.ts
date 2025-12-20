'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import type { RecommendationCategory, RecommendationFormData } from '../_types'

export function useAdminRecommendations() {
  const [categories, setCategories] = useState<RecommendationCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<RecommendationCategory | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<RecommendationCategory | null>(null)
  const [formData, setFormData] = useState<RecommendationFormData>({
    name: '',
    sort_order: 0,
    is_active: true,
  })

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/recommendations')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      } else {
        toast.error('추천 카테고리 조회 실패')
      }
    } catch (error) {
      console.error('추천 카테고리 조회 실패:', error)
      toast.error('추천 카테고리 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      sort_order: 0,
      is_active: true,
    })
    setEditingCategory(null)
  }, [])

  const openCreateModal = useCallback(() => {
    resetForm()
    setShowCreateModal(true)
  }, [resetForm])

  const openEditModal = useCallback((category: RecommendationCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      sort_order: category.sort_order,
      is_active: category.is_active,
    })
    setShowCreateModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowCreateModal(false)
    resetForm()
  }, [resetForm])

  const updateFormField = useCallback(
    <K extends keyof RecommendationFormData>(field: K, value: RecommendationFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleCreate = useCallback(async () => {
    if (!formData.name) {
      toast.error('카테고리 이름을 입력하세요')
      return false
    }

    try {
      const res = await fetch('/api/admin/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('카테고리가 생성되었습니다')
        closeModal()
        await fetchCategories()
        return true
      } else {
        toast.error(data.error || '카테고리 생성 실패')
        return false
      }
    } catch (error) {
      console.error('카테고리 저장 실패:', error)
      toast.error('카테고리 저장에 실패했습니다')
      return false
    }
  }, [formData, closeModal, fetchCategories])

  const handleUpdate = useCallback(async () => {
    if (!editingCategory || !formData.name) {
      toast.error('카테고리 이름을 입력하세요')
      return false
    }

    try {
      const res = await fetch(`/api/admin/recommendations/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('카테고리가 수정되었습니다')
        closeModal()
        await fetchCategories()
        return true
      } else {
        toast.error(data.error || '카테고리 수정 실패')
        return false
      }
    } catch (error) {
      console.error('카테고리 저장 실패:', error)
      toast.error('카테고리 저장에 실패했습니다')
      return false
    }
  }, [editingCategory, formData, closeModal, fetchCategories])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('카테고리를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/recommendations/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('카테고리가 삭제되었습니다')
        await fetchCategories()
        if (selectedCategory?.id === id) {
          setSelectedCategory(null)
        }
      } else {
        const data = await res.json()
        toast.error(data.error || '카테고리 삭제 실패')
      }
    } catch (error) {
      console.error('카테고리 삭제 실패:', error)
      toast.error('카테고리 삭제에 실패했습니다')
    }
  }, [selectedCategory, fetchCategories])

  return {
    categories,
    loading,
    showCreateModal,
    editingCategory,
    selectedCategory,
    formData,
    fetchCategories,
    setSelectedCategory,
    openCreateModal,
    openEditModal,
    closeModal,
    updateFormField,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}

