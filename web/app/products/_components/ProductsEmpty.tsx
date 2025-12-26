'use client'

import Link from 'next/link'

interface ProductsEmptyProps {
  searchQuery?: string | null
}

export default function ProductsEmpty({ searchQuery }: ProductsEmptyProps) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🔍</div>
      <p className="text-xl text-gray-600 mb-2">
        {searchQuery ? '검색 결과가 없습니다' : '등록된 상품이 없습니다'}
      </p>
      {searchQuery && (
        <Link href="/products">
          <button className="mt-4 px-6 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition">
            전체 상품 보기
          </button>
        </Link>
      )}
    </div>
  )
}

