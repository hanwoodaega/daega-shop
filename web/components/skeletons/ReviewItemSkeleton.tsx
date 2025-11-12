export default function ReviewItemSkeleton() {
  return (
    <div className="border-b border-gray-200 pt-5 pb-4 last:border-b-0 animate-pulse">
      {/* 별점과 사용자 정보 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1">
          {/* 별 아이콘들 */}
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-4 h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="w-16 h-4 bg-gray-200 rounded ml-1"></div>
        </div>
        <div className="w-20 h-3 bg-gray-200 rounded"></div>
      </div>

      {/* 이미지들 */}
      <div className="mb-3 overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1 w-max">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-[calc(25vw-1rem)] aspect-square bg-gray-200 rounded flex-shrink-0"></div>
          ))}
        </div>
      </div>

      {/* 제목 */}
      <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>

      {/* 내용 */}
      <div className="space-y-2 mb-3">
        <div className="w-full h-3 bg-gray-200 rounded"></div>
        <div className="w-5/6 h-3 bg-gray-200 rounded"></div>
        <div className="w-4/6 h-3 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

