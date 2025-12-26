export default function GiftSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-40">
          <div className="animate-pulse">
            <div className="w-full h-40 bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

