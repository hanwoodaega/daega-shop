// 상품 설명 컴포넌트 예시
// 이 파일을 복사하여 각 상품별 설명을 만들 수 있습니다.
// 파일명: ProductDescription-{slug}.tsx
// 예: ProductDescription-hanwoo-daega-no9-premium.tsx

interface ProductDescriptionProps {
  productId: string
  productName?: string
}

export default function ProductDescriptionExample({ productId, productName }: ProductDescriptionProps) {
  return (
    <div className="space-y-6">
      {/* 섹션 1: 상품 소개 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">상품 소개</h3>
        <p className="text-gray-700 leading-relaxed">
          여기에 상품에 대한 상세한 설명을 작성하세요.
        </p>
      </div>

      {/* 섹션 2: 특징 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">주요 특징</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>특징 1</li>
          <li>특징 2</li>
          <li>특징 3</li>
        </ul>
      </div>

      {/* 섹션 3: 이미지나 추가 정보 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">추가 정보</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-600 text-sm">
            추가적인 정보나 이미지를 여기에 배치할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}

