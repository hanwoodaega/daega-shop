import { ProductListState } from '../_types'

interface ProductPaginationProps {
  listState: ProductListState
  limit: number
  onPageChange: (page: number) => void
  onFetchList: () => void
}

export default function ProductPagination({
  listState,
  limit,
  onPageChange,
  onFetchList,
}: ProductPaginationProps) {
  const totalPages = Math.ceil(listState.total / limit)

  if (listState.total === 0) return null

  return (
    <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
      <div>
        총 <span className="text-neutral-900 font-semibold">{listState.total}</span>개 상품 /{' '}
        <span className="text-neutral-900 font-semibold">{listState.page}</span> / {totalPages}
        페이지
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            onPageChange(Math.max(1, listState.page - 1))
            setTimeout(onFetchList, 0)
          }}
          disabled={listState.page === 1}
          className="px-3 py-2 border rounded-lg text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>
        <button
          onClick={() => {
            onPageChange(Math.min(totalPages, listState.page + 1))
            setTimeout(onFetchList, 0)
          }}
          disabled={listState.page >= totalPages}
          className="px-3 py-2 border rounded-lg text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음
        </button>
      </div>
    </div>
  )
}

