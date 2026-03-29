import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Product } from '@/lib/supabase/supabase'
import { fetchAllProducts } from '../_utils/fetchers'

export function useAllProducts(searchQuery: string) {
  const router = useRouter()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const loadProducts = async () => {
    try {
      const products = await fetchAllProducts(searchQuery)
      setAllProducts(products)
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        router.push('/admin/login?next=/admin/gift-management')
        return
      }
      console.error('상품 조회 실패:', error)
      toast.error('상품 조회에 실패했습니다', { duration: 3000 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [searchQuery])

  return {
    allProducts,
    loading,
    refetch: loadProducts,
  }
}

