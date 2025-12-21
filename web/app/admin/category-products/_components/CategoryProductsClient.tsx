'use client'

import { useState, useCallback, useMemo } from 'react'
import AdminPageLayout from '../../_components/AdminPageLayout'
import CategoryTab from './CategoryTab'
import type { Category, Product } from '../_types'

interface CategoryProductsClientProps {
  bestCategory: Category | null
  saleCategory: Category | null
  no9Category: Category | null
  initialProducts: Product[]
  initialPromotedProductIds: string[]
}

type CategoryType = 'best' | 'sale' | 'no9'

export default function CategoryProductsClient({
  bestCategory,
  saleCategory,
  no9Category,
  initialProducts,
  initialPromotedProductIds,
}: CategoryProductsClientProps) {
  const [activeTab, setActiveTab] = useState<CategoryType>('best')
  const [categories, setCategories] = useState({
    best: bestCategory,
    sale: saleCategory,
    no9: no9Category,
  })

  // 프로모션 상품 ID Set
  const promotedProductIds = useMemo(
    () => new Set(initialPromotedProductIds),
    [initialPromotedProductIds]
  )

  // 카테고리 새로고침 함수
  const refreshCategory = useCallback(async (type: CategoryType) => {
    try {
      const res = await fetch('/api/admin/categories')
      if (!res.ok) return null

      const data = await res.json()
      const category = (data.categories || []).find((c: Category) => c.type === type)
      
      setCategories(prev => ({
        ...prev,
        [type]: category || null,
      }))
      
      return category
    } catch (error) {
      console.error('카테고리 조회 실패:', error)
      return null
    }
  }, [])

  const getCurrentCategory = () => categories[activeTab]

  const tabs = [
    { id: 'best' as CategoryType, label: '베스트', color: 'bg-amber-100 text-amber-700' },
    { id: 'sale' as CategoryType, label: '특가', color: 'bg-red-100 text-red-700' },
    { id: 'no9' as CategoryType, label: '한우대가 NO.9', color: 'bg-purple-100 text-purple-700' },
  ]

  return (
    <AdminPageLayout 
      title="카테고리 상품 관리" 
      description="베스트, 특가, 한우대가 NO.9 카테고리의 상품을 관리하세요"
    >
      <div className="space-y-6">
        {/* 작동 원리 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📌 작동 원리</h3>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>카테고리 타입은 <strong>'best', 'sale', 'no9'</strong> 3개만 존재합니다 (DB 제약조건)</li>
            <li>카테고리는 <strong>마이그레이션에서 자동 생성</strong>되며, 관리자가 생성할 필요가 없습니다</li>
            <li>각 타입은 고유한 페이지와 UI를 가집니다:
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>• <strong>베스트</strong> → <code className="bg-blue-100 px-1 rounded">/best</code> (간단한 베스트 페이지)</li>
                <li>• <strong>특가</strong> → <code className="bg-blue-100 px-1 rounded">/sale</code> (타임딜 섹션 + 특가 상품)</li>
                <li>• <strong>한우대가 NO.9</strong> → <code className="bg-blue-100 px-1 rounded">/no9</code> (설명 섹션 + 상품)</li>
              </ul>
            </li>
            <li>카테고리 제목은 <strong>변경되지 않습니다</strong> (각 페이지의 고유 UI에 하드코딩됨)</li>
            <li>설명은 관리자 페이지에서만 표시되며, 프론트엔드에서는 사용되지 않습니다</li>
            <li>여기서는 각 카테고리의 <strong>상품만 추가/제거/순서 조정</strong>할 수 있습니다</li>
            <li>새로운 카테고리 타입 추가는 불가능합니다 (각 타입마다 별도의 페이지가 필요함)</li>
          </ul>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-2 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab.id
                  ? `${tab.color} border-b-2 border-current`
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 현재 탭의 카테고리 관리 */}
        <CategoryTab
          type={activeTab}
          category={getCurrentCategory()}
          initialProducts={initialProducts}
          promotedProductIds={promotedProductIds}
          onCategoryRefreshed={() => refreshCategory(activeTab)}
        />
      </div>
    </AdminPageLayout>
  )
}

