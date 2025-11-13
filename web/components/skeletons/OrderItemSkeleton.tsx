export default function OrderItemSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="animate-pulse">
        {/* 주문 헤더 */}
        <div className="bg-gray-50 px-4 py-3 border-b">
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-20"></div>
        </div>
        
        {/* 주문 내용 */}
        <div className="p-4">
          {/* 상품 */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-gray-200 rounded"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
          
          {/* 구분선 */}
          <div className="border-t pt-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
          
          {/* 가격 */}
          <div className="border-t mt-3 pt-3">
            <div className="h-5 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  )
}


