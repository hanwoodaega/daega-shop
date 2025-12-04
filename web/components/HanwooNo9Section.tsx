import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Product, isSupabaseConfigured } from '@/lib/supabase'
import ProductCardSkeleton from './skeletons/ProductCardSkeleton'
import ProductCard from './ProductCard'

export default function HanwooNo9Section() {
  const [no9Products, setNo9Products] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNo9Products = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        // 한우대가 NO.9 컬렉션 조회 (3-4개)
        const response = await fetch('/api/collections/no9?limit=4')

        if (!response.ok) {
          setNo9Products([])
          setLoading(false)
          return
        }

        const data = await response.json()

        // 컬렉션이 없거나 상품이 없으면 빈 배열 반환
        if (!data.collection || !data.products || data.products.length === 0) {
          setNo9Products([])
          setLoading(false)
          return
        }

        // 상품 데이터 변환
        const activeProducts = (data.products || []).map((product: any) => ({
          ...product
        } as Product))
        setNo9Products(activeProducts as any)
      } catch (error) {
        console.error('한우대가 NO.9 상품 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNo9Products()
  }, [])


  if (loading) {
    return (
      <section className="py-6" style={{ backgroundColor: '#2F2A26' }}>
        <div className="container mx-auto px-4">
          <div className="mb-4">
            <div className="flex flex-col gap-2">
              <h2
                className="font-extrabold md:text-[28px] text-[24px]"
                style={{
                  color: '#F3E9D7',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  borderBottom: '2px solid #D9C79E',
                  paddingBottom: '8px'
                }}
              >
                한우대가 No.9 프리미엄
              </h2>
              <p
                className="md:text-[18px] text-[16px]"
                style={{
                  color: '#CBBBA3',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 500,
                  lineHeight: '1.5'
                }}
              >
                가장 자신 있는 한우만, 정직하게 선별했습니다.
              </p>
              {/* 이미지 영역 (회색으로 표현) */}
              <div className="mt-4 w-full h-32 bg-gray-300 rounded-sm flex items-center justify-center">
                <span className="text-gray-500 text-sm">이미지 준비중</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[180px]">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (no9Products.length === 0) {
    return null
  }

  return (
      <section className="pt-8 overflow-x-hidden" style={{ backgroundColor: '#2F2A26' }}>
        <div className="container mx-auto px-4">
          <div className="mb-4">
            <div className="flex flex-col gap-2">
              <h2
                className="font-extrabold md:text-[28px] text-[24px]"
                style={{
                  color: '#F3E9D7',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  borderBottom: '2px solid #D9C79E',
                  paddingBottom: '8px'
                }}
              >
                한우대가 No.9 프리미엄
              </h2>
              <p
                className="md:text-[18px] text-[16px]"
                style={{
                  color: '#CBBBA3',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 500,
                  lineHeight: '1.5'
                }}
              >
                가장 자신 있는 한우만, 정직하게 선별했습니다.
              </p>
              {/* 이미지 영역 (회색으로 표현) */}
              <div className="mt-4 w-full h-32 bg-gray-300 rounded-sm flex items-center justify-center">
                <span className="text-gray-500 text-sm">이미지 준비중</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white pt-8 pb-4 -mx-2 px-3 relative z-10">
          <div
            className="flex gap-4 overflow-x-auto pb-2 px-3 bg-white"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
          {no9Products.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[180px]">
              <ProductCard product={product} />
            </div>
          ))}
          </div>

          {/* 전체보기 버튼 */}
          <div className="mt-4 px-4 pb-4 bg-white">
            <Link href="/collections/no9" className="block">
              <button className="w-full px-2 py-2.5 rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2" style={{ backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #CCCCCC' }}>
                <span>전체보기</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Link>
          </div>
        </div>
        <div className="bg-white h-8 -mt-4"></div>
    </section>
  )
}
