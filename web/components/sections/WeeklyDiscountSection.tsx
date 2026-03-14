import Link from 'next/link'
import ProductCard from '@/components/product/ProductCard'
import { Collection } from '@/lib/collection'
import { Product } from '@/lib/supabase/supabase'

interface WeeklyDiscountSectionProps {
  collection: Collection | null
  products: Product[]
}

export default function WeeklyDiscountSection({
  collection,
  products,
}: WeeklyDiscountSectionProps) {
  if (!collection || products.length === 0) {
    return null
  }

  const typeSlug = (collection.type || '').trim().toLowerCase()
  const title = collection?.title || '오늘의 할인'
  const description = collection?.description || '놓칠 수 없는 이번 주 할인'

  return (
    <section className="py-8 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm lg:text-base font-medium text-gray-600 whitespace-pre-line">{description}</p>
          </div>
          <Link href={typeSlug ? `/collections/${typeSlug}` : '#'} prefetch={false} aria-label="전체보기">
            <button className="flex items-center px-1.5 py-0.5 text-gray-700 hover:text-gray-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
