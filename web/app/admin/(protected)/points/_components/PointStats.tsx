interface PointStatsProps {
  totalUserCount: number
  selectedUserCount: number
  selectedUsersTotalPoints: number
}

export default function PointStats({ 
  totalUserCount, 
  selectedUserCount, 
  selectedUsersTotalPoints 
}: PointStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <p className="text-sm text-gray-600 mb-1">전체 고객 수</p>
        <p className="text-2xl font-bold text-gray-900">{totalUserCount.toLocaleString()}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4">
        <p className="text-sm text-gray-600 mb-1">선택된 고객</p>
        <p className="text-2xl font-bold text-primary-800">{selectedUserCount.toLocaleString()}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4">
        <p className="text-sm text-gray-600 mb-1">선택 고객 총 포인트</p>
        <p className="text-2xl font-bold text-blue-600">{selectedUsersTotalPoints.toLocaleString()}P</p>
      </div>
    </div>
  )
}

