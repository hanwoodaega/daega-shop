import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/supabase/supabase'
import ProductCard from '@/components/product/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { Collection } from '@/lib/collection'

interface ColorTheme {
  background?: string
  accent?: string
  title_color?: string
}

interface CollectionSectionUIProps {
  collection: Collection & {
    description?: string | null
    color_theme?: ColorTheme | null
  }
  products: Product[]
  loading: boolean
}

export default function CollectionSectionUI({
  collection,
  products,
  loading,
}: CollectionSectionUIProps) {
  const theme = collection.color_theme || {
    background: '#F3E9D7',
    title_color: '#2A2A2A',
    accent: '#D9C79E',
  }
  const descriptionColor = '#111111'

  // 전체보기 링크 생성 (항상 /collections/{type}으로)
  const getViewAllLink = () => {
    return `/collections/${collection.type}`
  }

  if (loading) {
    return (
      <section className="py-6" style={{ backgroundColor: theme.background || '#F3E9D7' }}>
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="flex flex-col gap-2">
              {collection.description && (
                <p 
                  className="md:text-[26px] text-[22px]" 
                  style={{ 
                    color: descriptionColor,
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 700,
                    lineHeight: '1.5',
                    letterSpacing: '-0.5px',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {collection.description}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <section className="pt-6 lg:pt-3 overflow-x-hidden" style={{ backgroundColor: theme.background || '#F3E9D7' }}>
      <div className="container mx-auto px-2">
        <div className="mb-6 lg:mb-0 lg:pb-0">
          <div className="w-[96%] mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 text-left lg:py-1">
                {collection.title && (
                  <div className="hidden lg:flex items-center">
                    <h2
                      className="text-[22px] lg:text-[28px]"
                      style={{
                        color: theme.title_color || '#2A2A2A',
                        fontFamily: 'Pretendard, sans-serif',
                        fontWeight: 700,
                        lineHeight: '1.4',
                        letterSpacing: '-0.5px',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {collection.title}
                    </h2>
                    <Link href={getViewAllLink()} prefetch={false} aria-label="전체보기" className="ml-2">
                      <button
                        className="flex items-center px-1.5 py-0.5 hover:opacity-80 transition"
                        style={{ color: descriptionColor }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </Link>
                  </div>
                )}
                {collection.description && (
                  <div className="mt-0.5 lg:mt-1 flex items-center justify-between gap-3 lg:flex-col lg:items-start">
                    <p
                      className="text-[20px] lg:text-[21px] flex-1 whitespace-pre-line lg:whitespace-normal"
                      style={{
                        color: descriptionColor,
                        fontFamily: 'Pretendard, sans-serif',
                        fontWeight: 600,
                        lineHeight: '1.6',
                        letterSpacing: '-0.3px',
                      }}
                    >
                      {collection.description}
                    </p>
                    <Link href={getViewAllLink()} prefetch={false} aria-label="전체보기" className="lg:hidden">
                      <button
                        className="flex items-center px-1.5 py-0.5 hover:opacity-80 transition flex-shrink-0"
                        style={{ color: descriptionColor }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </Link>
                  </div>
                )}
              </div>
              {collection.image_url && (
                <div className="relative w-full lg:w-[38%]" style={{ aspectRatio: '16 / 9' }}>
                  <Image
                    src={collection.image_url}
                    alt={collection.title || collection.description || '컬렉션 이미지'}
                    fill
                    className="object-cover rounded-sm"
                    sizes="(max-width: 1024px) 100vw, 46vw"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white pt-6 pb-4 -mx-2 px-3 relative z-10 lg:mt-3">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 px-3 bg-white">
          {products.map((product, index) => (
            <div key={product.id} className={index >= 5 ? 'lg:hidden' : undefined}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        
        {/* 전체보기 버튼 */}
        <div className="mt-4 px-4 pb-4 bg-white">
          <Link href={getViewAllLink()} prefetch={false} className="block">
            <button className="w-full px-2 py-2.5 rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 bg-white text-black border border-gray-300">
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

