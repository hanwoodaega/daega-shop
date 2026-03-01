import { ADMIN_CATEGORIES } from '@/lib/utils/constants'
import { ProductListState } from '../_types'

interface ProductToolbarProps {
  listState: ProductListState
  onUpdateFilter: <K extends keyof ProductListState>(key: K, value: ProductListState[K]) => void
  onSearch: () => void
  onCreateClick: () => void
}

export default function ProductToolbar({
  listState,
  onUpdateFilter,
  onSearch,
  onCreateClick,
}: ProductToolbarProps) {
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onUpdateFilter('page', 1)
      onSearch()
    }
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <p className="text-sm text-neutral-500">상품 목록</p>
        <h2 className="text-lg font-semibold text-neutral-900">등록된 상품</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          value={listState.search}
          onChange={(e) => onUpdateFilter('search', e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="상품명/설명 검색"
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            onUpdateFilter('page', 1)
            onSearch()
          }}
          className="text-sm px-3 py-2 border rounded-lg"
        >
          검색
        </button>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={listState.filterCategory}
          onChange={(e) => {
            onUpdateFilter('filterCategory', e.target.value)
            onUpdateFilter('page', 1)
          }}
        >
          <option value="전체">전체 카테고리</option>
          {ADMIN_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={listState.filterStatus}
          onChange={(e) => {
            onUpdateFilter('filterStatus', e.target.value as ProductListState['filterStatus'])
            onUpdateFilter('page', 1)
          }}
        >
          <option value="all">전체 상태</option>
          <option value="active">판매중</option>
          <option value="soldout">품절</option>
          <option value="deleted">삭제됨</option>
        </select>
      </div>
    </div>
  )
}

