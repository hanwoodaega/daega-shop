import { useState, useEffect, useCallback, useRef } from 'react'
import { Product } from '@/lib/supabase/supabase'
import { GiftTarget, GiftBudget } from './gift.types'
import { fetchFeaturedGiftProducts, fetchTargetGiftProducts, fetchBudgetGiftProducts } from './gift.service'

interface UseGiftReturn {
  // Featured products
  giftProducts: Product[]
  loading: boolean
  
  // Target products
  selectedTarget: GiftTarget | null
  targetProducts: Product[]
  loadingTarget: boolean
  setSelectedTarget: (target: GiftTarget | null) => void
  
  // Budget products
  selectedBudget: GiftBudget | null
  budgetProducts: Product[]
  loadingBudget: boolean
  setSelectedBudget: (budget: GiftBudget | null) => void
}

const TARGET_SLUG_MAP: Record<string, string> = {
  '아이': 'child',
  '부모님': 'parent',
  '연인': 'lover',
  '친구': 'friend',
}

export function useGift(): UseGiftReturn {
  const [giftProducts, setGiftProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTarget, setSelectedTarget] = useState<GiftTarget | null>('아이')
  const [targetProducts, setTargetProducts] = useState<Product[]>([])
  const [loadingTarget, setLoadingTarget] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<GiftBudget | null>('under-50k')
  const [budgetProducts, setBudgetProducts] = useState<Product[]>([])
  const [loadingBudget, setLoadingBudget] = useState(false)
  const fetchingRef = useRef(false)

  // Fetch featured products
  const fetchGiftProducts = useCallback(async () => {
    if (fetchingRef.current) {
      console.log('[선물관] 이미 조회 중입니다. 중복 호출 방지')
      return
    }
    
    try {
      fetchingRef.current = true
      setLoading(true)
      console.log('[선물관] 상품 조회 시작')
      
      const data = await fetchFeaturedGiftProducts()
      console.log('[선물관] 상품 조회 성공:', data.products?.length || 0)
      
      setGiftProducts(data.products || [])
      setLoading(false)
    } catch (error) {
      console.error('[선물관] 선물세트 상품 조회 실패:', error)
      setGiftProducts([])
      setLoading(false)
    } finally {
      fetchingRef.current = false
    }
  }, [])

  // Fetch target products
  const fetchTargetProducts = useCallback(async (target: GiftTarget) => {
    setLoadingTarget(true)
    try {
      const targetSlug = TARGET_SLUG_MAP[target]
      if (!targetSlug) {
        setTargetProducts([])
        setLoadingTarget(false)
        return
      }

      const data = await fetchTargetGiftProducts(targetSlug)
      setTargetProducts(data.products || [])
    } catch (error) {
      console.error('선물 대상 상품 조회 실패:', error)
      setTargetProducts([])
    } finally {
      setLoadingTarget(false)
    }
  }, [])

  // Fetch budget products
  const fetchBudgetProducts = useCallback(async (budgetType: GiftBudget) => {
    setLoadingBudget(true)
    try {
      const data = await fetchBudgetGiftProducts(budgetType)
      setBudgetProducts(data.products || [])
    } catch (error) {
      console.error('예산별 상품 조회 실패:', error)
      setBudgetProducts([])
    } finally {
      setLoadingBudget(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    let mounted = true
    fetchGiftProducts().catch(() => {
      if (mounted) {
        setLoading(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [fetchGiftProducts])

  // Target change effect
  useEffect(() => {
    if (selectedTarget) {
      fetchTargetProducts(selectedTarget)
    } else {
      setTargetProducts([])
    }
  }, [selectedTarget, fetchTargetProducts])

  // Budget change effect
  useEffect(() => {
    if (selectedBudget) {
      fetchBudgetProducts(selectedBudget)
    } else {
      setBudgetProducts([])
    }
  }, [selectedBudget, fetchBudgetProducts])

  return {
    giftProducts,
    loading,
    selectedTarget,
    targetProducts,
    loadingTarget,
    setSelectedTarget,
    selectedBudget,
    budgetProducts,
    loadingBudget,
    setSelectedBudget,
  }
}

