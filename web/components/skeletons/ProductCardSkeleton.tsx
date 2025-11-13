export default function ProductCardSkeleton() {
  return (
    <div className="bg-white shadow-sm">
      <div className="animate-pulse">
        {/* 이미지 영역 */}
        <div className="aspect-square bg-gray-200"></div>
        
        {/* 텍스트 영역 */}
        <div className="pt-2 pb-3 pr-4 pl-2">
          {/* 브랜드명 */}
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
          {/* 상품명 */}
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          {/* 가격 */}
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  )
}


