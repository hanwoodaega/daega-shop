'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Product, ProductNoticeCategory, ProductNoticeField, ProductNoticeValue } from '@/lib/supabase/supabase'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import toast from 'react-hot-toast'

export default function ProductInfoPage() {
  const params = useParams()
  const router = useRouter()
  const slugOrId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [noticeCategory, setNoticeCategory] = useState<ProductNoticeCategory | null>(null)
  const [noticeFields, setNoticeFields] = useState<ProductNoticeField[]>([])
  const [noticeValues, setNoticeValues] = useState<ProductNoticeValue[]>([])

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // slug 또는 UUID로 조회 (notice_category_id 포함)
        const selectFields = 'id,slug,brand,name,price,notice_category_id'
        
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
        if (!data) {
          setProduct(null)
        } else {
          const productData = data as Product
          setProduct(productData)

          // 상품고시 카테고리/필드/값 조회
          if (productData.notice_category_id) {
            const [{ data: cat }, { data: fields }, { data: values }] = await Promise.all([
              supabase
                .from('product_notice_categories')
                .select('*')
                .eq('id', productData.notice_category_id)
                .maybeSingle(),
              supabase
                .from('product_notice_fields')
                .select('*')
                .eq('category_id', productData.notice_category_id)
                .order('sort_order', { ascending: true }),
              supabase
                .from('product_notice_values')
                .select('*')
                .eq('product_id', productData.id),
            ])
            if (cat) setNoticeCategory(cat as ProductNoticeCategory)
            setNoticeFields((fields ?? []) as ProductNoticeField[])
            setNoticeValues((values ?? []) as ProductNoticeValue[])
          } else {
            setNoticeCategory(null)
            setNoticeFields([])
            setNoticeValues([])
          }
        }
      } catch (error) {
        console.error('상품 조회 실패:', error)
        toast.error('상품을 찾을 수 없습니다.', { duration: 3000 })
        router.push('/products')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [slugOrId, router])

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* PC: 메인 헤더 + 메인 메뉴, 모바일: 기존 간단 헤더 유지 */}
      <div className="hidden lg:block">
        <Header />
      </div>
      {/* 모바일 전용 상단 바 (이전 스타일) */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
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

      <main className="flex-1 container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : !product ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500">상품을 찾을 수 없습니다.</div>
          </div>
        ) : !noticeCategory || noticeFields.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">등록된 상품고시정보가 없습니다.</p>
          </div>
        ) : (
          <section className="max-w-3xl mx-auto border border-gray-200 rounded-lg overflow-hidden bg-white">
            <header className="bg-white px-4 py-4 border-b border-gray-200">
              {/* PC: 상품명 왼쪽에 뒤로가기 꺾쇠 + 상품명 */}
              <div className="hidden lg:flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-800 transition"
                  aria-label="뒤로가기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <p className="text-base md:text-lg font-semibold text-gray-900">
                  {product.name}
                </p>
              </div>
              {/* 모바일에서는 기존처럼 상품명만 표시 */}
              <p className="text-base md:text-lg font-semibold text-gray-900 lg:hidden">
                {product.name}
              </p>
            </header>
            <table className="w-full text-sm md:text-base">
              <tbody>
                {noticeFields.map((field) => {
                  const value = noticeValues.find((v) => v.field_id === field.id)?.value ?? ''
                  return (
                    <tr key={field.id} className="border-b last:border-b-0">
                      <th className="w-1/3 bg-white px-3 py-2 text-left align-top text-gray-700 text-sm md:text-base">
                        <span>{field.label}</span>
                      </th>
                      <td className="px-3 py-2 align-top text-gray-800 whitespace-pre-line text-sm md:text-base">
                        {value || <span className="text-gray-400 text-xs">-</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}

