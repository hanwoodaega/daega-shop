'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Product } from '@/lib/supabase/supabase'
import { getProductInfo } from '@/components/product-info'
import toast from 'react-hot-toast'

export default function ProductInfoPage() {
  const params = useParams()
  const router = useRouter()
  const slugOrId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [ProductInfoComponent, setProductInfoComponent] = useState<React.ComponentType<{ productId: string; productName?: string }> | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // slug 또는 UUID로 조회
        const selectFields = 'id,slug,brand,name,price'
        
        // UUID 형식인지 확인하는 함수
        const isUUID = (str: string): boolean => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          return uuidRegex.test(str)
        }
        
        let query
        let { data, error } = { data: null, error: null }
        
        // UUID인 경우 바로 id로 조회, 아니면 slug로 먼저 시도
        if (isUUID(slugOrId)) {
          query = supabase
            .from('products')
            .select(selectFields)
            .eq('id', slugOrId)
            .single()
          
          const result = await query
          data = result.data
          error = result.error
        } else {
          // slug로 먼저 시도
          query = supabase
            .from('products')
            .select(selectFields)
            .eq('slug', slugOrId)
            .single()

          const result = await query
          data = result.data
          error = result.error

          // slug로 찾지 못했으면 UUID로 시도
          if (error || !data) {
            query = supabase
              .from('products')
              .select(selectFields)
              .eq('id', slugOrId)
              .single()
            
            const result = await query
            data = result.data
            error = result.error
          }
        }
        
        if (error) throw error
        setProduct(data)
      } catch (error) {
        console.error('상품 조회 실패:', error)
        toast.error('상품을 찾을 수 없습니다.')
        router.push('/products')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [slugOrId, router])

  // 상품고시정보 컴포넌트 로드
  useEffect(() => {
    if (product) {
      // slug가 있으면 slug를 우선 사용, 없으면 이름 사용
      const slugOrName = product.slug || product.name
      getProductInfo(slugOrName, product.id).then((Component) => {
        setProductInfoComponent(() => Component)
      })
    }
  }, [product?.slug, product?.name, product?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">상품을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full transition"
            aria-label="뒤로가기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 flex-1">상품고시정보</h1>
        </div>
      </header>

      {/* 내용 */}
      <main className="container mx-auto px-4 py-6">
        {/* 상품고시정보 */}
        {ProductInfoComponent ? (
          <ProductInfoComponent productId={product.id} productName={product.name} />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">등록된 상품고시정보가 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  )
}

