import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ADMIN_CATEGORIES } from '@/lib/constants'
import { PRODUCT_LIST_LIMIT } from '../constants'
import { Product, ProductFormData, ProductListState, ProductUIState } from '../_types'

// 상품 생성 결과 타입
type CreateProductResult =
  | { success: true; productId: string }
  | { success: false }

const INITIAL_FORM_STATE: ProductFormData = {
  brand: '',
  name: '',
  slug: '',
  price: '',
  category: ADMIN_CATEGORIES[0],
  weight_gram: '',
}

export function useAdminProducts() {
  const router = useRouter()
  
  const [form, setForm] = useState<ProductFormData>({ ...INITIAL_FORM_STATE })
  const [uiState, setUIState] = useState<ProductUIState>({
    error: null,
    loading: false,
    loadingList: false,
  })
  const [listState, setListState] = useState<ProductListState>({
    items: [],
    filterCategory: '전체',
    search: '',
    page: 1,
    total: 0,
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [togglingSoldOut, setTogglingSoldOut] = useState<string | null>(null)

  // 상품 목록 조회
  // page / category 변경 시 자동 조회
  // search는 엔터/버튼으로만 조회 (자동 X)
  const fetchList = useCallback(async () => {
    setUIState(prev => ({ ...prev, loadingList: true }))
    try {
      const params = new URLSearchParams()
      if (listState.filterCategory && listState.filterCategory !== '전체') {
        params.set('category', listState.filterCategory)
      }
      if (listState.search.trim()) {
        params.set('q', listState.search.trim())
      }
      params.set('page', String(listState.page))
      params.set('limit', String(PRODUCT_LIST_LIMIT))
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/admin/products${qs}`)
      const data = await res.json()
      if (res.ok) {
        setListState(prev => ({ 
          ...prev, 
          items: data.items || [], 
          total: typeof data.total === 'number' ? data.total : prev.total 
        }))
      } else {
        // list 조회 실패 → toast (전역 피드백)
        const errorMessage = data.error || '상품 목록을 불러오는데 실패했습니다.'
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('상품 목록 조회 실패:', error)
      toast.error('상품 목록을 불러오는데 실패했습니다.')
    } finally {
      setUIState(prev => ({ ...prev, loadingList: false }))
    }
  }, [listState.filterCategory, listState.search, listState.page])

  // page / category 변경 시 자동 조회
  // search는 엔터/버튼으로만 조회 (자동 X)
  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listState.page, listState.filterCategory])

  const updateFormField = useCallback(<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  // 상품 생성
  // create → uiState.error (폼 안에서 보여야 하니까)
  const handleSubmit = useCallback(async (): Promise<CreateProductResult> => {
    setUIState(prev => ({ ...prev, error: null, loading: true }))
    try {
      const payload = {
        brand: form.brand.trim() || null,
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        price: Number(form.price),
        category: form.category,
        weight_gram: form.weight_gram ? parseInt(form.weight_gram.toString(), 10) : null,
      }
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('Product registration error:', data)
        // create 실패 → uiState.error (폼 안에서 보여야 하니까)
        setUIState(prev => ({ ...prev, error: data.error || '등록에 실패했습니다.', loading: false }))
        return { success: false }
      }
      // 성공 시 생성된 상품 정보 받기
      const data = await res.json()
      const createdProductId = data.product?.id
      
      if (!createdProductId) {
        console.error('상품 ID가 반환되지 않았습니다.')
        setUIState(prev => ({ ...prev, error: '상품 등록에 실패했습니다.', loading: false }))
        return { success: false }
      }
      
      // 성공 시 toast로 피드백
      toast.success('상품이 등록되었습니다.')
      setUIState(prev => ({ ...prev, loading: false }))
      await fetchList()
      
      // 생성된 상품 ID 반환
      return { success: true, productId: createdProductId }
    } catch (error) {
      console.error('상품 등록 실패:', error)
      // create 실패 → uiState.error (폼 안에서 보여야 하니까)
      setUIState(prev => ({ ...prev, error: '상품 등록에 실패했습니다.', loading: false }))
      return { success: false }
    }
  }, [form, fetchList])

  // 상품 삭제
  // list/edit/toggle → toast (전역 피드백)
  // 메시지 자동 제거는 page에서 toast로 처리
  const removeItem = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setListState(prev => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }))
      // 성공 메시지는 page에서 toast로 처리
      return true
    } else {
      // list/edit/toggle 실패 → toast (전역 피드백)
      const data = await res.json().catch(() => ({ error: '삭제 실패' }))
      toast.error(data.error || '삭제에 실패했습니다.')
      return false
    }
  }, [])

  const startEdit = useCallback((product: Product) => {
    setEditing({ ...product })
  }, [])

  // 품절 상태 토글
  // list/edit/toggle → toast (전역 피드백)
  const toggleSoldOut = useCallback(async (productId: string, currentStatus: string) => {
    setTogglingSoldOut(productId)
    try {
      const newStatus = currentStatus === 'soldout' ? 'active' : 'soldout'
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        }),
      })
      if (res.ok) {
        await fetchList()
        toast.success(`상품이 ${newStatus === 'soldout' ? '품절 처리' : '판매 재개'}되었습니다.`)
        return true
      } else {
        // list/edit/toggle 실패 → toast (전역 피드백)
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || '품절 상태 변경에 실패했습니다.')
        return false
      }
    } catch (error) {
      console.error('품절 상태 변경 실패:', error)
      // list/edit/toggle 실패 → toast (전역 피드백)
      toast.error('품절 상태 변경에 실패했습니다.')
      return false
    } finally {
      setTogglingSoldOut(null)
    }
  }, [fetchList])

  // 상품 수정
  // list/edit/toggle → toast (전역 피드백)
  const saveEdit = useCallback(async () => {
    if (!editing) return false
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/admin/products/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: editing.brand,
          name: editing.name,
          slug: editing.slug?.trim() || null,
          price: Number(editing.price),
          category: editing.category,
          weight_gram: editing.weight_gram ? parseInt(editing.weight_gram.toString(), 10) : null,
        }),
      })
      if (res.ok) {
        setListState((prev) => ({
          ...prev,
          items: prev.items.map((i) => (i.id === editing.id ? { ...i, ...editing } : i))
        }))
        setEditing(null)
        toast.success('상품이 수정되었습니다.')
        return true
      } else {
        // list/edit/toggle 실패 → toast (전역 피드백)
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || '상품 수정에 실패했습니다.')
        return false
      }
    } catch (error) {
      console.error('상품 수정 실패:', error)
      // list/edit/toggle 실패 → toast (전역 피드백)
      toast.error('상품 수정에 실패했습니다.')
      return false
    } finally {
      setSavingEdit(false)
    }
  }, [editing])

  const updateListFilter = useCallback(<K extends keyof ProductListState>(
    key: K,
    value: ProductListState[K]
  ) => {
    setListState(prev => ({ ...prev, [key]: value }))
  }, [])

  const openCreateModal = useCallback(() => {
    setForm({ ...INITIAL_FORM_STATE })
    setIsCreateOpen(true)
  }, [])

  const closeCreateModal = useCallback(() => {
    setIsCreateOpen(false)
    setForm({ ...INITIAL_FORM_STATE })
  }, [])

  const clearError = useCallback(() => {
    setUIState(prev => ({ ...prev, error: null }))
  }, [])

  // 라우팅 함수 (hook은 "행동"만 노출)
  const goToImport = useCallback(() => {
    router.push('/admin/products/import')
  }, [router])

  return {
    // State
    form,
    uiState,
    listState,
    isCreateOpen,
    editing,
    savingEdit,
    togglingSoldOut,
    // Actions
    updateFormField,
    handleSubmit,
    removeItem,
    startEdit,
    toggleSoldOut,
    saveEdit,
    updateListFilter,
    openCreateModal,
    closeCreateModal,
    clearError,
    setEditing,
    fetchList,
    goToImport,
  }
}

