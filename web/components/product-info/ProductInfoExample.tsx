// 상품고시정보 컴포넌트 예시
// 이 파일을 복사하여 각 상품별 상품고시정보를 만들 수 있습니다.
// 파일명: ProductInfo-{slug}.tsx
// 예: ProductInfo-harim-breast-blackpepper.tsx

interface ProductInfoProps {
  productId: string
  productName?: string
}

export default function ProductInfoExample({ productId, productName }: ProductInfoProps) {
  return (
    <div className="space-y-6">
      {/* 섹션 1: 기본 정보 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">품목</h3>
        <p className="text-gray-700">축산물</p>
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
        <p className="text-gray-700">냉장 보관 (0~4℃)</p>
      </div>

      {/* 섹션 5: 유통기한 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">유통기한</h3>
        <p className="text-gray-700">제조일로부터 7일</p>
      </div>
    </div>
  )
}

