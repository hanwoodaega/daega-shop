'use client'

import type { TimeDeal } from '../_types'

interface TimeDealListProps {
  timeDeals: TimeDeal[]
  selectedTimeDeal: TimeDeal | null
  loading: boolean
  isActive: (timeDeal: TimeDeal) => boolean
  onSelectTimeDeal: (timeDeal: TimeDeal) => void
}

export default function TimeDealList({
  timeDeals,
  selectedTimeDeal,
  loading,
  isActive,
  onSelectTimeDeal,
}: TimeDealListProps) {
  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>
  }

  if (timeDeals.length === 0) {
    return <div className="text-center py-8 text-gray-500">타임딜이 없습니다</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-bold mb-4">타임딜 목록</h2>
      <div className="space-y-2">
        {timeDeals.map((timeDeal) => (
          <div
            key={timeDeal.id}
            onClick={() => onSelectTimeDeal(timeDeal)}
            className={`p-3 rounded-lg cursor-pointer transition ${
              selectedTimeDeal?.id === timeDeal.id
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{timeDeal.title}</h3>
                  {isActive(timeDeal) && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                      진행중
                    </span>
                  )}
                </div>
                {timeDeal.description && (
                  <p className="text-xs text-gray-500 mt-1">{timeDeal.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(timeDeal.start_at).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  ~{' '}
                  {new Date(timeDeal.end_at).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

