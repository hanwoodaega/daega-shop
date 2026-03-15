import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Promotion, PromotionFormData } from '../_types'
import { INITIAL_FORM_DATA } from '../constants'

export function useAdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [formData, setFormData] = useState<PromotionFormData>(INITIAL_FORM_DATA)

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/promotions')
      const data = await res.json()
      if (res.ok) {
        setPromotions(data.promotions || [])
      } else {
        toast.error('프로모션 조회에 실패했습니다')
      }
    } catch (error) {
      console.error('프로모션 조회 실패:', error)
      toast.error('프로모션 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  const handleCreate = useCallback(async (productIds: string[]) => {
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요')
      return false
    }

    if (formData.type === 'bogo' && !formData.buy_qty) {
      toast.error('BOGO 타입은 구매 개수를 입력해주세요')
      return false
    }

    if (formData.type === 'percent' && !formData.discount_percent) {
      toast.error('할인율을 입력해주세요')
      return false
    }

    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          product_ids: productIds,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('프로모션이 생성되었습니다')
        setShowCreateModal(false)
        resetForm()
        await fetchPromotions()
        return true
      } else {
        toast.error(data.error || '프로모션 생성에 실패했습니다')
        return false
      }
    } catch (error) {
      console.error('프로모션 생성 실패:', error)
      toast.error('프로모션 생성에 실패했습니다')
      return false
    }
  }, [formData, fetchPromotions])

  const handleUpdate = useCallback(async () => {
    if (!editingPromotion) return false

    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요')
      return false
    }

    try {
      const res = await fetch(`/api/admin/promotions/${editingPromotion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('프로모션이 수정되었습니다')
        setEditingPromotion(null)
        resetForm()
        await fetchPromotions()
        return true
      } else {
        toast.error(data.error || '프로모션 수정에 실패했습니다')
        return false
      }
    } catch (error) {
      console.error('프로모션 수정 실패:', error)
      toast.error('프로모션 수정에 실패했습니다')
      return false
    }
  }, [editingPromotion, formData, fetchPromotions])

  const handleDelete = useCallback(async (promotionId: string) => {
    if (!window.confirm('이 프로모션을 삭제하시겠습니까?')) return false

    try {
      const res = await fetch(`/api/admin/promotions/${promotionId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('프로모션이 삭제되었습니다')
        await fetchPromotions()
        return true
      } else {
        const data = await res.json()
        toast.error(data.error || '프로모션 삭제에 실패했습니다')
        return false
      }
    } catch (error) {
      console.error('프로모션 삭제 실패:', error)
      toast.error('프로모션 삭제에 실패했습니다')
      return false
    }
  }, [fetchPromotions])

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
  }, [])

  const openCreateModal = useCallback(() => {
    resetForm()
    setEditingPromotion(null)
    setShowCreateModal(true)
  }, [resetForm])

  const openEditModal = useCallback(async (promotion: Promotion, onProductIdsLoaded?: (productIds: string[]) => void) => {
    setEditingPromotion(promotion)
    setFormData({
      title: promotion.title,
      type: promotion.type,
      buy_qty: promotion.buy_qty || 1,
      discount_percent: promotion.discount_percent || 0,
      is_active: promotion.is_active,
      group_id: '',
    })

    // 프로모션에 연결된 상품 조회
    try {
      const res = await fetch(`/api/admin/promotions/${promotion.id}`)
      const data = await res.json()
      if (res.ok && data.products && onProductIdsLoaded) {
        const productIds = data.products.map((p: any) => p.product_id)
        onProductIdsLoaded(productIds)
      }
    } catch (error) {
      console.error('상품 조회 실패:', error)
    }

    setShowCreateModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowCreateModal(false)
    resetForm()
    setEditingPromotion(null)
  }, [resetForm])

  const updateFormField = useCallback(<K extends keyof PromotionFormData>(
    field: K,
    value: PromotionFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  return {
    promotions,
    loading,
    showCreateModal,
    editingPromotion,
    formData,
    fetchPromotions,
    handleCreate,
    handleUpdate,
    handleDelete,
    openCreateModal,
    openEditModal,
    closeModal,
    updateFormField,
    resetForm,
  }
}

