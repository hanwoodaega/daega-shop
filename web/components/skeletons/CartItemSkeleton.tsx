export default function CartItemSkeleton() {
  return (
    <div className="py-6 border-b border-gray-200">
      <div className="animate-pulse flex items-start space-x-3">
        {/* 체크박스 */}
        <div className="w-6 h-6 bg-gray-200 rounded mt-9"></div>
        
        {/* 이미지 */}
        <div className="w-24 h-24 bg-gray-200 rounded flex-shrink-0"></div>
        
        {/* 상품 정보 */}
        <div className="flex-1">
          {/* 브랜드 */}
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
          {/* 상품명 */}
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
          {/* 가격 */}
          <div className="h-5 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  )
}

