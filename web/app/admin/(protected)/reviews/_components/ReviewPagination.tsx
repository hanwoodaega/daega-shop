'use client'

interface ReviewPaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export default function ReviewPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: ReviewPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="text-sm text-gray-600">
        총 <span className="font-semibold">{total}</span>건
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
        >
          «
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
        >
          ‹
        </button>
        <span className="text-sm">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
        >
          »
        </button>
      </div>
    </div>
  )
}

