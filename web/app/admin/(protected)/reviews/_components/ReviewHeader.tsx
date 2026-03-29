'use client'

import type { ReviewStatus, ReviewFilters } from '../_types'

type SetFilterFunction = <K extends keyof ReviewFilters>(key: K, value: ReviewFilters[K]) => void

interface ReviewHeaderProps {
  status: ReviewStatus
  filters: ReviewFilters
  onStatusChange: (status: ReviewStatus) => void
  onFilterChange: SetFilterFunction
}

export default function ReviewHeader({ 
  status, 
  filters,
  onStatusChange, 
  onFilterChange 
}: ReviewHeaderProps) {
  return (
    <div className="mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">리뷰 관리</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as ReviewStatus)}
          >
            <option value="pending">대기</option>
            <option value="approved">승인</option>
          </select>
        </div>
      </div>
      
      {/* 날짜 필터 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          작성 날짜
        </label>
        <input
          type="date"
          value={filters.date}
          onChange={(e) => onFilterChange('date', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-800"
        />
      </div>
    </div>
  )
}

