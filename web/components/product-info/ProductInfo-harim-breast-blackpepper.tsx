// 하림 닭가슴살 블랙페퍼 상품고시정보

interface ProductInfoProps {
  productId: string
  productName?: string
}

export default function ProductInfoHarimBreastBlackpepper({ productId, productName }: ProductInfoProps) {
  return (
    <div className="space-y-6">
      {/* 섹션 1: 품목 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">품목</h3>
        <p className="text-gray-700">축산물 (닭가슴살)</p>
      </div>

      {/* 섹션 2: 중량 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">중량</h3>
        <p className="text-gray-700">100g</p>
      </div>

      {/* 섹션 3: 원산지 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">원산지</h3>
        <p className="text-gray-700">국내산</p>
      </div>

      {/* 섹션 4: 보관방법 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">보관방법</h3>
        <p className="text-gray-700">냉장 보관 (0~4℃), 냉동 보관 가능</p>
      </div>

      {/* 섹션 5: 유통기한 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">유통기한</h3>
        <p className="text-gray-700">제조일로부터 냉장 7일, 냉동 1년</p>
      </div>

      {/* 섹션 6: 제조사 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">제조사</h3>
        <p className="text-gray-700">하림</p>
      </div>

      {/* 섹션 7: 영양성분 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">영양성분 (100g 기준)</h3>
        <div className="text-gray-700 space-y-1">
          <p>열량: 120kcal</p>
          <p>단백질: 25g</p>
          <p>지방: 2g</p>
          <p>탄수화물: 1g</p>
          <p>나트륨: 450mg</p>
        </div>
      </div>
    </div>
  )
}



