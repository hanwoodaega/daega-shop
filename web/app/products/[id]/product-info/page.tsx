'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Product } from '@/lib/supabase'
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
        // slug 또는 UUID로 조회 (먼저 slug로 시도, 없으면 UUID로)
        let query = supabase
          .from('products')
          .select('*')
          .eq('slug', slugOrId)
          .single()

        let { data, error } = await query

        // slug로 찾지 못했으면 UUID로 시도
        if (error || !data) {
          query = supabase
            .from('products')
            .select('*')
            .eq('id', slugOrId)
            .single()
          
          const result = await query
          data = result.data
          error = result.error
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
    <div className="min-h-screen bg-gray-50">
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
        {/* 상품 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div>
            {product.brand && (
              <div className="text-sm text-gray-500 mb-1">{product.brand}</div>
            )}
            <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
          </div>
        </div>

        {/* 상품고시정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">상품고시정보</h2>
          {ProductInfoComponent ? (
            <ProductInfoComponent productId={product.id} productName={product.name} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">등록된 상품고시정보가 없습니다.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

