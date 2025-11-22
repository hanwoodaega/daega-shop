'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Product } from '@/lib/supabase'

const GIFT_TARGETS = ['아이', '부모님', '연인', '친구'] as const
type GiftTarget = typeof GIFT_TARGETS[number]

const BUDGET_CATEGORIES = [
  { value: 'under-50k', label: '5만원 미만' },
  { value: 'over-50k', label: '5만원 이상' },
  { value: 'over-100k', label: '10만원 이상' },
  { value: 'over-200k', label: '20만원 이상' },
] as const

type TabType = 'target' | 'budget' | 'featured'

export default function GiftManagementPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('target')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [giftProducts, setGiftProducts] = useState<Product[]>([])
  const [budgetProducts, setBudgetProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [reordering, setReordering] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string>('전체')
  const [selectedBudget, setSelectedBudget] = useState<string>('전체')
  const [searchQuery, setSearchQuery] = useState('')
  
  // 상품 추가 폼 상태
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedTargets, setSelectedTargets] = useState<GiftTarget[]>([])
  const [selectedBudgetTargets, setSelectedBudgetTargets] = useState<string[]>([])
  const [displayOrder, setDisplayOrder] = useState<string>('')

  useEffect(() => {
    fetchAllProducts()
    if (activeTab === 'target') {
      fetchGiftProducts()
    } else if (activeTab === 'budget') {
      fetchBudgetProducts()
    } else {
      fetchFeaturedProducts()
    }
  }, [selectedTarget, selectedBudget, activeTab])

  const fetchAllProducts = async () => {
    try {
      // 모든 상품 조회 (선물 대상 필터링 없이)
      const response = await fetch(`/api/admin/products?limit=1000`)

      if (response.status === 401) {
        router.push('/admin/login?next=/admin/gift-management')
        return
      }

      if (!response.ok) {
        throw new Error('상품 조회 실패')
      }

      const data = await response.json()
      let products = data.items || []
      
      // 검색어 필터링
      if (searchQuery) {
        products = products.filter((p: Product) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      setAllProducts(products)
    } catch (error) {
      console.error('상품 조회 실패:', error)
      toast.error('상품 조회에 실패했습니다')
    }
  }

  const fetchGiftProducts = async () => {
    setLoading(true)
    try {
      // 대상별 카테고리 slug 매핑
      const targetSlugMap: Record<string, string> = {
        '아이': 'child',
        '부모님': 'parent',
        '연인': 'lover',
        '친구': 'friend',
      }

      // 모든 대상 카테고리 조회
      const categoriesRes = await fetch('/api/admin/gift-categories')
      if (!categoriesRes.ok) throw new Error('카테고리 조회 실패')
      const categoriesData = await categoriesRes.json()
      const targetCategories = categoriesData.categories?.filter((c: any) => 
        ['child', 'parent', 'lover', 'friend'].includes(c.slug)
      ) || []

      // 선택된 대상의 카테고리만 필터링
      let categoriesToFetch = targetCategories
      if (selectedTarget !== '전체') {
        const targetSlug = targetSlugMap[selectedTarget]
        categoriesToFetch = targetCategories.filter((c: any) => c.slug === targetSlug)
      }

      // 각 카테고리의 상품 조회
      const allProducts: any[] = []
      for (const category of categoriesToFetch) {
        const productsRes = await fetch(`/api/admin/gift-categories/${category.id}`)
        if (productsRes.ok) {
          const productsData = await productsRes.json()
          const categoryProducts = (productsData.products || []).map((cp: any) => ({
            ...(Array.isArray(cp.products) ? cp.products[0] : cp.products),
            gift_display_order: cp.priority,
            gift_target: [category.name],
          }))
          allProducts.push(...categoryProducts)
        }
      }

      // 중복 제거 (같은 상품이 여러 카테고리에 있을 수 있음)
      const uniqueProducts = Array.from(
        new Map(allProducts.map(p => [p.id, p])).values()
      )

      // 순서대로 정렬
      uniqueProducts.sort((a: any, b: any) => {
        const orderA = a.gift_display_order ?? 999999
        const orderB = b.gift_display_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      setGiftProducts(uniqueProducts as Product[])
    } catch (error) {
      console.error('상품 조회 실패:', error)
      toast.error('상품 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchBudgetProducts = async () => {
    setLoading(true)
    try {
      // 예산별 카테고리 slug 매핑
      const budgetSlugMap: Record<string, string> = {
        '5만원 미만': 'under-50k',
        '5만원 이상': 'over-50k',
        '10만원 이상': 'over-100k',
        '20만원 이상': 'over-200k',
      }

      // 모든 예산 카테고리 조회
      const categoriesRes = await fetch('/api/admin/gift-categories')
      if (!categoriesRes.ok) throw new Error('카테고리 조회 실패')
      const categoriesData = await categoriesRes.json()
      const budgetCategories = categoriesData.categories?.filter((c: any) => 
        ['under-50k', 'over-50k', 'over-100k', 'over-200k'].includes(c.slug)
      ) || []

      // 선택된 예산의 카테고리만 필터링
      let categoriesToFetch = budgetCategories
      if (selectedBudget !== '전체') {
        const budgetSlug = budgetSlugMap[selectedBudget]
        categoriesToFetch = budgetCategories.filter((c: any) => c.slug === budgetSlug)
      }

      // 각 카테고리의 상품 조회
      const allProducts: any[] = []
      for (const category of categoriesToFetch) {
        const productsRes = await fetch(`/api/admin/gift-categories/${category.id}`)
        if (productsRes.ok) {
          const productsData = await productsRes.json()
          const categoryProducts = (productsData.products || []).map((cp: any) => ({
            ...(Array.isArray(cp.products) ? cp.products[0] : cp.products),
            gift_budget_order: cp.priority,
            gift_budget_targets: [category.name],
          }))
          allProducts.push(...categoryProducts)
        }
      }

      // 중복 제거
      const uniqueProducts = Array.from(
        new Map(allProducts.map(p => [p.id, p])).values()
      )

      // 순서대로 정렬
      uniqueProducts.sort((a: any, b: any) => {
        const orderA = a.gift_budget_order ?? 999999
        const orderB = b.gift_budget_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      setBudgetProducts(uniqueProducts as Product[])
    } catch (error) {
      console.error('상품 조회 실패:', error)
      toast.error('상품 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchFeaturedProducts = async () => {
    setLoading(true)
    try {
      // 실시간 인기 카테고리 조회
      const categoriesRes = await fetch('/api/admin/gift-categories')
      if (!categoriesRes.ok) throw new Error('카테고리 조회 실패')
      const categoriesData = await categoriesRes.json()
      const featuredCategory = categoriesData.categories?.find((c: any) => c.slug === 'featured')

      if (!featuredCategory) {
        setFeaturedProducts([])
        return
      }

      // 실시간 인기 카테고리의 상품 조회
      const productsRes = await fetch(`/api/admin/gift-categories/${featuredCategory.id}`)
      if (!productsRes.ok) throw new Error('상품 조회 실패')
      const productsData = await productsRes.json()
      
      const featured = (productsData.products || []).map((cp: any) => ({
        ...(Array.isArray(cp.products) ? cp.products[0] : cp.products),
        gift_featured_order: cp.priority,
        gift_featured: true,
      }))
      
      // 순서대로 정렬
      featured.sort((a: any, b: any) => {
        const orderA = a.gift_featured_order ?? 999999
        const orderB = b.gift_featured_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      setFeaturedProducts(featured as Product[])
    } catch (error) {
      console.error('상품 조회 실패:', error)
      toast.error('상품 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleTargetToggle = async (productId: string, target: GiftTarget) => {
    const product = giftProducts.find((p) => p.id === productId)
    if (!product) return

    setSaving(productId)
    try {
      // 대상별 카테고리 slug 매핑
      const targetSlugMap: Record<string, string> = {
        '아이': 'child',
        '부모님': 'parent',
        '연인': 'lover',
        '친구': 'friend',
      }

      const targetSlug = targetSlugMap[target]
      if (!targetSlug) {
        throw new Error('잘못된 대상입니다')
      }

      // 카테고리 조회
      const categoryRes = await fetch(`/api/admin/gift-categories?slug=${targetSlug}`)
      if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
      const categoryData = await categoryRes.json()
      const category = categoryData.categories?.find((c: any) => c.slug === targetSlug)
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      // 현재 상품이 해당 카테고리에 있는지 확인
      const categoryDetailRes = await fetch(`/api/admin/gift-categories/${category.id}`)
      if (!categoryDetailRes.ok) throw new Error('카테고리 상세 조회 실패')
      const categoryDetail = await categoryDetailRes.json()
      const isInCategory = categoryDetail.products?.some((cp: any) => 
        (Array.isArray(cp.products) ? cp.products[0]?.id : cp.products?.id) === productId
      )

      if (isInCategory) {
        // 카테고리에서 제거
        const response = await fetch(`/api/admin/gift-categories/${category.id}/products?product_id=${productId}`, {
          method: 'DELETE',
        })

        if (response.status === 401) {
          router.push('/admin/login?next=/admin/gift-management')
          return
        }

        if (!response.ok) {
          throw new Error('제거 실패')
        }
      } else {
        // 카테고리에 추가
        const response = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_ids: [productId],
            priority: 999999, // 마지막에 추가
          }),
        })

        if (response.status === 401) {
          router.push('/admin/login?next=/admin/gift-management')
          return
        }

        if (!response.ok) {
          throw new Error('추가 실패')
        }
      }

      toast.success('선물 대상이 업데이트되었습니다')
      fetchGiftProducts() // 목록 새로고침
    } catch (error) {
      console.error('선물 대상 업데이트 실패:', error)
      toast.error('업데이트에 실패했습니다')
    } finally {
      setSaving(null)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return

    const product = giftProducts[index]
    const prevProduct = giftProducts[index - 1]
    
    setReordering(product.id)
    try {
      // 현재 상품과 이전 상품의 순서를 교환
      const currentOrder = (product as any).gift_display_order ?? 999999
      const prevOrder = (prevProduct as any).gift_display_order ?? 999999

      // 선택된 대상의 카테고리 찾기
      const targetSlugMap: Record<string, string> = {
        '아이': 'child',
        '부모님': 'parent',
        '연인': 'lover',
        '친구': 'friend',
      }

      let targetSlug = 'child' // 기본값
      if (selectedTarget !== '전체') {
        targetSlug = targetSlugMap[selectedTarget] || 'child'
      } else {
        // 전체인 경우 첫 번째 상품의 gift_target에서 찾기
        const firstTarget = Array.isArray((product as any).gift_target) && (product as any).gift_target.length > 0 
          ? (product as any).gift_target[0] 
          : '아이'
        targetSlug = targetSlugMap[firstTarget] || 'child'
      }

      const categoryRes = await fetch(`/api/admin/gift-categories?slug=${targetSlug}`)
      if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
      const categoryData = await categoryRes.json()
      const category = categoryData.categories?.find((c: any) => c.slug === targetSlug)
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      // 두 상품의 순서를 교환
      const response1 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, priority: prevOrder }),
      })

      const response2 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: prevProduct.id, priority: currentOrder }),
      })

      if (!response1.ok || !response2.ok) {
        throw new Error('순서 변경 실패')
      }

      // 로컬 상태 업데이트
      setGiftProducts((prev) => {
        const newProducts = [...prev]
        ;[newProducts[index], newProducts[index - 1]] = [newProducts[index - 1], newProducts[index]]
        return newProducts.map((p, i) => {
          if (p.id === product.id) return { ...p, gift_display_order: prevOrder }
          if (p.id === prevProduct.id) return { ...p, gift_display_order: currentOrder }
          return p
        })
      })

      toast.success('순서가 변경되었습니다')
    } catch (error) {
      console.error('순서 변경 실패:', error)
      toast.error('순서 변경에 실패했습니다')
      fetchGiftProducts() // 실패 시 다시 로드
    } finally {
      setReordering(null)
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index === giftProducts.length - 1) return

    const product = giftProducts[index]
    const nextProduct = giftProducts[index + 1]
    
    setReordering(product.id)
    try {
      // 현재 상품과 다음 상품의 순서를 교환
      const currentOrder = (product as any).gift_display_order ?? 999999
      const nextOrder = (nextProduct as any).gift_display_order ?? 999999

      // 선택된 대상의 카테고리 찾기
      const targetSlugMap: Record<string, string> = {
        '아이': 'child',
        '부모님': 'parent',
        '연인': 'lover',
        '친구': 'friend',
      }

      let targetSlug = 'child' // 기본값
      if (selectedTarget !== '전체') {
        targetSlug = targetSlugMap[selectedTarget] || 'child'
      } else {
        // 전체인 경우 첫 번째 상품의 gift_target에서 찾기
        const firstTarget = Array.isArray((product as any).gift_target) && (product as any).gift_target.length > 0 
          ? (product as any).gift_target[0] 
          : '아이'
        targetSlug = targetSlugMap[firstTarget] || 'child'
      }

      const categoryRes = await fetch(`/api/admin/gift-categories?slug=${targetSlug}`)
      if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
      const categoryData = await categoryRes.json()
      const category = categoryData.categories?.find((c: any) => c.slug === targetSlug)
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      // 두 상품의 순서를 교환
      const response1 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, priority: nextOrder }),
      })

      const response2 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: nextProduct.id, priority: currentOrder }),
      })

      if (!response1.ok || !response2.ok) {
        throw new Error('순서 변경 실패')
      }

      // 로컬 상태 업데이트
      setGiftProducts((prev) => {
        const newProducts = [...prev]
        ;[newProducts[index], newProducts[index + 1]] = [newProducts[index + 1], newProducts[index]]
        return newProducts.map((p, i) => {
          if (p.id === product.id) return { ...p, gift_display_order: nextOrder }
          if (p.id === nextProduct.id) return { ...p, gift_display_order: currentOrder }
          return p
        })
      })

      toast.success('순서가 변경되었습니다')
    } catch (error) {
      console.error('순서 변경 실패:', error)
      toast.error('순서 변경에 실패했습니다')
      fetchGiftProducts() // 실패 시 다시 로드
    } finally {
      setReordering(null)
    }
  }

  const handleBudgetToggle = async (productId: string, budget: string) => {
    const product = budgetProducts.find((p) => p.id === productId)
    if (!product) return

    setSaving(productId)
    try {
      // 예산별 카테고리 slug 매핑
      const budgetSlugMap: Record<string, string> = {
        '5만원 미만': 'under-50k',
        '5만원 이상': 'over-50k',
        '10만원 이상': 'over-100k',
        '20만원 이상': 'over-200k',
      }

      const budgetSlug = budgetSlugMap[budget]
      if (!budgetSlug) {
        throw new Error('잘못된 예산입니다')
      }

      // 카테고리 조회
      const categoryRes = await fetch(`/api/admin/gift-categories?slug=${budgetSlug}`)
      if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
      const categoryData = await categoryRes.json()
      const category = categoryData.categories?.find((c: any) => c.slug === budgetSlug)
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      // 현재 상품이 해당 카테고리에 있는지 확인
      const categoryDetailRes = await fetch(`/api/admin/gift-categories/${category.id}`)
      if (!categoryDetailRes.ok) throw new Error('카테고리 상세 조회 실패')
      const categoryDetail = await categoryDetailRes.json()
      const isInCategory = categoryDetail.products?.some((cp: any) => 
        (Array.isArray(cp.products) ? cp.products[0]?.id : cp.products?.id) === productId
      )

      if (isInCategory) {
        // 카테고리에서 제거
        const response = await fetch(`/api/admin/gift-categories/${category.id}/products?product_id=${productId}`, {
          method: 'DELETE',
        })

        if (response.status === 401) {
          router.push('/admin/login?next=/admin/gift-management')
          return
        }

        if (!response.ok) {
          throw new Error('제거 실패')
        }
      } else {
        // 카테고리에 추가
        const response = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_ids: [productId],
            priority: 999999, // 마지막에 추가
          }),
        })

        if (response.status === 401) {
          router.push('/admin/login?next=/admin/gift-management')
          return
        }

        if (!response.ok) {
          throw new Error('추가 실패')
        }
      }

      toast.success('예산 카테고리가 업데이트되었습니다')
      fetchBudgetProducts() // 목록 새로고침
    } catch (error) {
      console.error('예산 카테고리 업데이트 실패:', error)
      toast.error('업데이트에 실패했습니다')
    } finally {
      setSaving(null)
    }
  }

  const handleBudgetMoveUp = async (index: number) => {
    if (index === 0) return

    const product = budgetProducts[index]
    const prevProduct = budgetProducts[index - 1]
    
    setReordering(product.id)
    try {
      const currentOrder = (product as any).gift_budget_order ?? 999999
      const prevOrder = (prevProduct as any).gift_budget_order ?? 999999

      // 선택된 예산의 카테고리 찾기
      const budgetSlugMap: Record<string, string> = {
        '5만원 미만': 'under-50k',
        '5만원 이상': 'over-50k',
        '10만원 이상': 'over-100k',
        '20만원 이상': 'over-200k',
      }

      let budgetSlug = 'under-50k' // 기본값
      if (selectedBudget !== '전체') {
        budgetSlug = budgetSlugMap[selectedBudget] || 'under-50k'
      } else {
        // 전체인 경우 첫 번째 상품의 gift_budget_targets에서 찾기
        const firstBudget = Array.isArray((product as any).gift_budget_targets) && (product as any).gift_budget_targets.length > 0 
          ? (product as any).gift_budget_targets[0] 
          : '5만원 미만'
        budgetSlug = budgetSlugMap[firstBudget] || 'under-50k'
      }

      const categoryRes = await fetch(`/api/admin/gift-categories?slug=${budgetSlug}`)
      if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
      const categoryData = await categoryRes.json()
      const category = categoryData.categories?.find((c: any) => c.slug === budgetSlug)
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      // 두 상품의 순서를 교환
      const response1 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, priority: prevOrder }),
      })

      const response2 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: prevProduct.id, priority: currentOrder }),
      })

      if (!response1.ok || !response2.ok) {
        throw new Error('순서 변경 실패')
      }

      setBudgetProducts((prev) => {
        const newProducts = [...prev]
        ;[newProducts[index], newProducts[index - 1]] = [newProducts[index - 1], newProducts[index]]
        return newProducts.map((p) => {
          if (p.id === product.id) return { ...p, gift_budget_order: prevOrder }
          if (p.id === prevProduct.id) return { ...p, gift_budget_order: currentOrder }
          return p
        })
      })

      toast.success('순서가 변경되었습니다')
    } catch (error) {
      console.error('순서 변경 실패:', error)
      toast.error('순서 변경에 실패했습니다')
      fetchBudgetProducts()
    } finally {
      setReordering(null)
    }
  }

  const handleBudgetMoveDown = async (index: number) => {
    if (index === budgetProducts.length - 1) return

    const product = budgetProducts[index]
    const nextProduct = budgetProducts[index + 1]
    
    setReordering(product.id)
    try {
      const currentOrder = (product as any).gift_budget_order ?? 999999
      const nextOrder = (nextProduct as any).gift_budget_order ?? 999999

      // 선택된 예산의 카테고리 찾기
      const budgetSlugMap: Record<string, string> = {
        '5만원 미만': 'under-50k',
        '5만원 이상': 'over-50k',
        '10만원 이상': 'over-100k',
        '20만원 이상': 'over-200k',
      }

      let budgetSlug = 'under-50k' // 기본값
      if (selectedBudget !== '전체') {
        budgetSlug = budgetSlugMap[selectedBudget] || 'under-50k'
      } else {
        // 전체인 경우 첫 번째 상품의 gift_budget_targets에서 찾기
        const firstBudget = Array.isArray((product as any).gift_budget_targets) && (product as any).gift_budget_targets.length > 0 
          ? (product as any).gift_budget_targets[0] 
          : '5만원 미만'
        budgetSlug = budgetSlugMap[firstBudget] || 'under-50k'
      }

      const categoryRes = await fetch(`/api/admin/gift-categories?slug=${budgetSlug}`)
      if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
      const categoryData = await categoryRes.json()
      const category = categoryData.categories?.find((c: any) => c.slug === budgetSlug)
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      // 두 상품의 순서를 교환
      const response1 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, priority: nextOrder }),
      })

      const response2 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: nextProduct.id, priority: currentOrder }),
      })

      if (!response1.ok || !response2.ok) {
        throw new Error('순서 변경 실패')
      }

      setBudgetProducts((prev) => {
        const newProducts = [...prev]
        ;[newProducts[index], newProducts[index + 1]] = [newProducts[index + 1], newProducts[index]]
        return newProducts.map((p) => {
          if (p.id === product.id) return { ...p, gift_budget_order: nextOrder }
          if (p.id === nextProduct.id) return { ...p, gift_budget_order: currentOrder }
          return p
        })
      })

      toast.success('순서가 변경되었습니다')
    } catch (error) {
      console.error('순서 변경 실패:', error)
      toast.error('순서 변경에 실패했습니다')
      fetchBudgetProducts()
    } finally {
      setReordering(null)
    }
  }

  const handleFeaturedToggle = async (productId: string) => {
    const product = featuredProducts.find((p) => p.id === productId) || allProducts.find((p) => p.id === productId)
    if (!product) return

    setSaving(productId)
    try {
      // 실시간 인기 카테고리 조회
      const categoryRes = await fetch(`/api/admin/gift-categories?slug=featured`)
      if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
      const categoryData = await categoryRes.json()
      const category = categoryData.categories?.find((c: any) => c.slug === 'featured')
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      // 현재 상품이 해당 카테고리에 있는지 확인
      const categoryDetailRes = await fetch(`/api/admin/gift-categories/${category.id}`)
      if (!categoryDetailRes.ok) throw new Error('카테고리 상세 조회 실패')
      const categoryDetail = await categoryDetailRes.json()
      const isInCategory = categoryDetail.products?.some((cp: any) => 
        (Array.isArray(cp.products) ? cp.products[0]?.id : cp.products?.id) === productId
      )

      if (isInCategory) {
        // 카테고리에서 제거
        const response = await fetch(`/api/admin/gift-categories/${category.id}/products?product_id=${productId}`, {
          method: 'DELETE',
        })

        if (response.status === 401) {
          router.push('/admin/login?next=/admin/gift-management')
          return
        }

        if (!response.ok) {
          throw new Error('제거 실패')
        }
      } else {
        // 카테고리에 추가
        const response = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_ids: [productId],
            priority: 999999, // 마지막에 추가
          }),
        })

        if (response.status === 401) {
          router.push('/admin/login?next=/admin/gift-management')
          return
        }

        if (!response.ok) {
          throw new Error('추가 실패')
        }
      }

      toast.success('인기 선물세트 설정이 업데이트되었습니다')
      fetchFeaturedProducts()
    } catch (error) {
      console.error('인기 선물세트 업데이트 실패:', error)
      toast.error('업데이트에 실패했습니다')
    } finally {
      setSaving(null)
    }
  }

  const handleFeaturedMoveUp = async (index: number) => {
    if (index === 0) return

    const product = featuredProducts[index]
    const prevProduct = featuredProducts[index - 1]
    
    setReordering(product.id)
    try {
      const currentOrder = (product as any).gift_featured_order ?? 999999
      const prevOrder = (prevProduct as any).gift_featured_order ?? 999999

      // 실시간 인기 카테고리 조회
      const categoryRes = await fetch(`/api/admin/gift-categories?slug=featured`)
      if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
      const categoryData = await categoryRes.json()
      const category = categoryData.categories?.find((c: any) => c.slug === 'featured')
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      // 두 상품의 순서를 교환
      const response1 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, priority: prevOrder }),
      })

      const response2 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: prevProduct.id, priority: currentOrder }),
      })

      if (!response1.ok || !response2.ok) {
        throw new Error('순서 변경 실패')
      }

      setFeaturedProducts((prev) => {
        const newProducts = [...prev]
        ;[newProducts[index], newProducts[index - 1]] = [newProducts[index - 1], newProducts[index]]
        return newProducts.map((p) => {
          if (p.id === product.id) return { ...p, gift_featured_order: prevOrder }
          if (p.id === prevProduct.id) return { ...p, gift_featured_order: currentOrder }
          return p
        })
      })

      toast.success('순서가 변경되었습니다')
    } catch (error) {
      console.error('순서 변경 실패:', error)
      toast.error('순서 변경에 실패했습니다')
      fetchFeaturedProducts()
    } finally {
      setReordering(null)
    }
  }

  const handleFeaturedMoveDown = async (index: number) => {
    if (index === featuredProducts.length - 1) return

    const product = featuredProducts[index]
    const nextProduct = featuredProducts[index + 1]
    
    setReordering(product.id)
    try {
      const currentOrder = (product as any).gift_featured_order ?? 999999
      const nextOrder = (nextProduct as any).gift_featured_order ?? 999999

      // 실시간 인기 카테고리 조회
      const categoryRes = await fetch(`/api/admin/gift-categories?slug=featured`)
      if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
      const categoryData = await categoryRes.json()
      const category = categoryData.categories?.find((c: any) => c.slug === 'featured')
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      // 두 상품의 순서를 교환
      const response1 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, priority: nextOrder }),
      })

      const response2 = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: nextProduct.id, priority: currentOrder }),
      })

      if (!response1.ok || !response2.ok) {
        throw new Error('순서 변경 실패')
      }

      setFeaturedProducts((prev) => {
        const newProducts = [...prev]
        ;[newProducts[index], newProducts[index + 1]] = [newProducts[index + 1], newProducts[index]]
        return newProducts.map((p) => {
          if (p.id === product.id) return { ...p, gift_featured_order: nextOrder }
          if (p.id === nextProduct.id) return { ...p, gift_featured_order: currentOrder }
          return p
        })
      })

      toast.success('순서가 변경되었습니다')
    } catch (error) {
      console.error('순서 변경 실패:', error)
      toast.error('순서 변경에 실패했습니다')
      fetchFeaturedProducts()
    } finally {
      setReordering(null)
    }
  }

  const handleAddProduct = async () => {
    if (activeTab === 'target') {
      if (!selectedProductId || selectedTargets.length === 0 || !displayOrder) {
        toast.error('모든 항목을 입력해주세요')
        return
      }
    } else if (activeTab === 'budget') {
      if (!selectedProductId || selectedBudgetTargets.length === 0 || !displayOrder) {
        toast.error('모든 항목을 입력해주세요')
        return
      }
    } else {
      if (!selectedProductId || !displayOrder) {
        toast.error('모든 항목을 입력해주세요')
        return
      }
    }

    setSaving('adding')
    try {
      const order = parseInt(displayOrder)
      if (isNaN(order) || order < 1) {
        toast.error('우선순위는 1 이상의 숫자여야 합니다')
        return
      }

      // gift_categories slug 매핑
      const targetSlugMap: Record<string, string> = {
        '아이': 'child',
        '부모님': 'parent',
        '연인': 'lover',
        '친구': 'friend',
      }
      
      const budgetSlugMap: Record<string, string> = {
        '5만원 미만': 'under-50k',
        '5만원 이상': 'over-50k',
        '10만원 이상': 'over-100k',
        '20만원 이상': 'over-200k',
      }

      if (activeTab === 'target') {
        // 각 대상별로 gift_category_products에 추가
        for (const target of selectedTargets) {
          const slug = targetSlugMap[target]
          if (!slug) continue

          // 카테고리 조회
          const categoryRes = await fetch(`/api/admin/gift-categories?slug=${slug}`)
          if (!categoryRes.ok) continue
          const categoryData = await categoryRes.json()
          const category = categoryData.categories?.find((c: any) => c.slug === slug)
          if (!category) continue

          // 상품 추가
          const response = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_ids: [selectedProductId],
              priority: order,
            }),
          })

          if (!response.ok) {
            throw new Error(`${target} 카테고리에 추가 실패`)
          }
        }
      } else if (activeTab === 'budget') {
        // 각 예산별로 gift_category_products에 추가
        // selectedBudgetTargets에는 이미 slug 값이 들어있음 (under-50k, over-50k 등)
        for (const budgetSlug of selectedBudgetTargets) {
          // 카테고리 조회
          const categoryRes = await fetch(`/api/admin/gift-categories?slug=${budgetSlug}`)
          if (!categoryRes.ok) {
            console.error(`카테고리 조회 실패: ${budgetSlug}`)
            continue
          }
          const categoryData = await categoryRes.json()
          const category = categoryData.categories?.find((c: any) => c.slug === budgetSlug)
          if (!category) {
            console.error(`카테고리를 찾을 수 없습니다: ${budgetSlug}`)
            continue
          }

          // 상품 추가
          const response = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_ids: [selectedProductId],
              priority: order,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error(`상품 추가 실패: ${budgetSlug}`, errorData)
            throw new Error(`${budgetSlug} 카테고리에 추가 실패: ${errorData.error || response.statusText}`)
          }
        }
      } else {
        // 실시간 인기 카테고리
        const categoryRes = await fetch(`/api/admin/gift-categories?slug=featured`)
        if (!categoryRes.ok) throw new Error('실시간 인기 카테고리를 찾을 수 없습니다')
        const categoryData = await categoryRes.json()
        const category = categoryData.categories?.find((c: any) => c.slug === 'featured')
        if (!category) throw new Error('실시간 인기 카테고리를 찾을 수 없습니다')

        const response = await fetch(`/api/admin/gift-categories/${category.id}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_ids: [selectedProductId],
            priority: order,
          }),
        })

        if (!response.ok) {
          throw new Error('추가 실패')
        }
      }

      toast.success('상품이 추가되었습니다')
      setShowAddForm(false)
      setSelectedProductId('')
      setSelectedTargets([])
      setSelectedBudgetTargets([])
      setDisplayOrder('')
      if (activeTab === 'target') {
        fetchGiftProducts()
      } else if (activeTab === 'budget') {
        fetchBudgetProducts()
      } else {
        fetchFeaturedProducts()
      }
      fetchAllProducts()
    } catch (error) {
      console.error('상품 추가 실패:', error)
      toast.error('상품 추가에 실패했습니다')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="text-neutral-600 hover:text-neutral-900 mb-2"
              >
                ← 뒤로가기
              </button>
              <h1 className="text-2xl font-semibold">선물관 관리</h1>
              <p className="text-sm text-neutral-500 mt-1">
                선물 대상 및 예산별로 상품을 설정하고 관리하세요
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium"
            >
              {showAddForm ? '취소' : '+ 상품 추가'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* 탭 */}
        <div className="bg-white rounded-lg mb-6 shadow-sm border border-neutral-200">
          <div className="flex border-b border-neutral-200">
            <button
              onClick={() => {
                setActiveTab('target')
                setShowAddForm(false)
              }}
              className={`flex-1 px-6 py-3 text-center font-medium transition ${
                activeTab === 'target'
                  ? 'text-pink-600 border-b-2 border-pink-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              선물 대상
            </button>
            <button
              onClick={() => {
                setActiveTab('budget')
                setShowAddForm(false)
              }}
              className={`flex-1 px-6 py-3 text-center font-medium transition ${
                activeTab === 'budget'
                  ? 'text-pink-600 border-b-2 border-pink-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              예산별
            </button>
            <button
              onClick={() => {
                setActiveTab('featured')
                setShowAddForm(false)
              }}
              className={`flex-1 px-6 py-3 text-center font-medium transition ${
                activeTab === 'featured'
                  ? 'text-pink-600 border-b-2 border-pink-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              실시간 인기
            </button>
          </div>
        </div>

        {/* 상품 추가 폼 */}
        {showAddForm && (
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-neutral-200">
            <h2 className="text-lg font-semibold mb-4">상품 추가</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">상품 선택</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
                >
                  <option value="">상품을 선택하세요</option>
                  {allProducts
                    .filter((p) => {
                      if (activeTab === 'target') {
                        return !giftProducts.some((gp) => gp.id === p.id)
                      } else if (activeTab === 'budget') {
                        return !budgetProducts.some((bp) => bp.id === p.id)
                      } else {
                        return !featuredProducts.some((fp) => fp.id === p.id)
                      }
                    })
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.price.toLocaleString()}원)
                      </option>
                    ))}
                </select>
              </div>
              {activeTab === 'target' ? (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">선물 대상 (중복 선택 가능)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GIFT_TARGETS.map((target) => (
                      <label key={target} className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedTargets.includes(target)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTargets([...selectedTargets, target])
                            } else {
                              setSelectedTargets(selectedTargets.filter((t) => t !== target))
                            }
                          }}
                          className="w-4 h-4 text-pink-600 rounded"
                        />
                        <span className="text-sm font-medium">{target}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'budget' ? (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">예산 카테고리 (중복 선택 가능)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUDGET_CATEGORIES.map((budget) => (
                      <label key={budget.value} className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedBudgetTargets.includes(budget.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBudgetTargets([...selectedBudgetTargets, budget.value])
                            } else {
                              setSelectedBudgetTargets(selectedBudgetTargets.filter((b) => b !== budget.value))
                            }
                          }}
                          className="w-4 h-4 text-pink-600 rounded"
                        />
                        <span className="text-sm font-medium">{budget.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">우선순위 (숫자가 작을수록 앞에 표시)</label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  placeholder="예: 1 (첫 번째), 2 (두 번째)..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
                />
              </div>
              <button
                onClick={handleAddProduct}
                disabled={
                  !selectedProductId ||
                  (activeTab === 'target' ? selectedTargets.length === 0 : activeTab === 'budget' ? selectedBudgetTargets.length === 0 : false) ||
                  !displayOrder
                }
                className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                추가하기
              </button>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-neutral-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {activeTab === 'target' ? '선물 대상' : '예산 카테고리'}
              </label>
              <select
                value={activeTab === 'target' ? selectedTarget : selectedBudget}
                onChange={(e) => {
                  if (activeTab === 'target') {
                    setSelectedTarget(e.target.value)
                  } else {
                    setSelectedBudget(e.target.value)
                  }
                }}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
              >
                <option value="전체">전체</option>
                {activeTab === 'target' ? (
                  GIFT_TARGETS.map((target) => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))
                ) : (
                  BUDGET_CATEGORIES.map((budget) => (
                    <option key={budget.value} value={budget.value}>
                      {budget.label}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 mb-2">상품 검색</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  fetchAllProducts()
                }}
                placeholder="상품명으로 검색..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
              />
            </div>
          </div>
        </div>

        {/* 상품 목록 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800 mx-auto"></div>
            <p className="text-neutral-500 mt-4">로딩 중...</p>
          </div>
        ) : (activeTab === 'target' ? giftProducts : activeTab === 'budget' ? budgetProducts : featuredProducts).length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-neutral-200">
            <p className="text-neutral-500">
              {activeTab === 'target' ? '선물 대상' : activeTab === 'budget' ? '예산 카테고리' : '실시간 인기 선물세트'}이 설정된 상품이 없습니다
            </p>
            <p className="text-sm text-neutral-400 mt-2">상품 추가 버튼을 눌러 상품을 추가하세요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(activeTab === 'target' ? giftProducts : activeTab === 'budget' ? budgetProducts : featuredProducts).map((product, index) => {
              const isSaving = saving === product.id
              const isReordering = reordering === product.id
              const currentTargets = activeTab === 'target' 
                ? (Array.isArray((product as any).gift_target) ? (product as any).gift_target : [])
                : activeTab === 'budget'
                ? (Array.isArray((product as any).gift_budget_targets) ? (product as any).gift_budget_targets : [])
                : []
              const displayOrder = activeTab === 'target' 
                ? (product as any).gift_display_order 
                : activeTab === 'budget'
                ? (product as any).gift_budget_order
                : (product as any).gift_featured_order

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* 순서 변경 버튼 */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            if (activeTab === 'target') handleMoveUp(index)
                            else if (activeTab === 'budget') handleBudgetMoveUp(index)
                            else handleFeaturedMoveUp(index)
                          }}
                          disabled={index === 0 || isReordering}
                          className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="위로 이동"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (activeTab === 'target') handleMoveDown(index)
                            else if (activeTab === 'budget') handleBudgetMoveDown(index)
                            else handleFeaturedMoveDown(index)
                          }}
                          disabled={index === (activeTab === 'target' ? giftProducts : activeTab === 'budget' ? budgetProducts : featuredProducts).length - 1 || isReordering}
                          className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="아래로 이동"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-900 mb-1">{product.name}</h3>
                        <p className="text-sm text-neutral-500">
                          {product.brand && `${product.brand} · `}
                          {product.price.toLocaleString()}원
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          우선순위: {displayOrder ?? '미설정'}
                          {activeTab !== 'featured' && ` · ${activeTab === 'target' ? '대상' : '예산'}: ${currentTargets.map((t: string) => {
                            if (activeTab === 'target') return t
                            const budget = BUDGET_CATEGORIES.find(b => b.value === t)
                            return budget ? budget.label : t
                          }).join(', ')}`}
                        </p>
                      </div>
                    </div>
                    {activeTab !== 'featured' && (
                      <div className="flex-shrink-0">
                        <div className="grid grid-cols-2 gap-2">
                          {activeTab === 'target' ? (
                            GIFT_TARGETS.map((target) => {
                              const isSelected = currentTargets.includes(target)
                              return (
                                <button
                                  key={target}
                                  onClick={() => handleTargetToggle(product.id, target)}
                                  disabled={isSaving || isReordering}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    isSelected
                                      ? 'bg-pink-600 text-white hover:bg-pink-700'
                                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                  } ${isSaving || isReordering ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {target}
                                </button>
                              )
                            })
                          ) : (
                            BUDGET_CATEGORIES.map((budget) => {
                              const isSelected = currentTargets.includes(budget.value)
                              return (
                                <button
                                  key={budget.value}
                                  onClick={() => handleBudgetToggle(product.id, budget.value)}
                                  disabled={isSaving || isReordering}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    isSelected
                                      ? 'bg-pink-600 text-white hover:bg-pink-700'
                                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                  } ${isSaving || isReordering ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {budget.label}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )}
                    {activeTab === 'featured' && (
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleFeaturedToggle(product.id)}
                          disabled={isSaving || isReordering}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          제거
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

