// 하림 닭가슴살 블랙페퍼 상품 설명

interface ProductDescriptionProps {
  productId: string
  productName?: string
}

export default function ProductDescriptionHarimBreastBlackpepper({ productId, productName }: ProductDescriptionProps) {
  return (
    <div className="space-y-6">
      {/* 섹션 1: 상품 소개 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">상품 소개</h3>
        <p className="text-gray-700 leading-relaxed">
          하림 닭가슴살 블랙페퍼는 부드러운 닭가슴살에 진한 블랙페퍼 시즈닝을 더해 풍부한 맛을 선사합니다. 
          간편하게 조리할 수 있어 바쁜 일상 속에서도 건강한 식단을 유지할 수 있습니다.
        </p>
      </div>

      {/* 섹션 2: 주요 특징 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">주요 특징</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>고단백, 저지방으로 다이어트에 최적화된 영양 구성</li>
          <li>진한 블랙페퍼 시즈닝으로 풍부한 맛과 향</li>
          <li>간편한 조리로 언제 어디서나 즐길 수 있는 편의성</li>
          <li>국내산 신선한 닭가슴살 사용</li>
        </ul>
      </div>

      {/* 섹션 3: 영양 정보 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">영양 정보</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-600 text-sm mb-2">
            닭가슴살은 단백질이 풍부하고 지방이 적어 건강한 식단에 이상적인 식재료입니다. 
            블랙페퍼는 신진대사를 촉진하고 소화를 돕는 효과가 있어 다이어트와 건강 관리에 도움이 됩니다.
          </p>
        </div>
      </div>

      {/* 섹션 4: 조리 방법 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">조리 방법</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>냉동 상태라면 해동 후 사용하세요</li>
          <li>팬에 기름을 두르고 중불에서 앞뒤로 구워주세요</li>
          <li>완전히 익을 때까지 약 5-7분간 조리하세요</li>
          <li>전자레인지로도 간편하게 조리할 수 있습니다</li>
        </ol>
      </div>

      {/* 섹션 5: 보관 방법 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">보관 방법</h3>
        <p className="text-gray-700 leading-relaxed">
          냉동 보관 시 -18℃ 이하에서 보관하시고, 해동 후에는 냉장 보관하여 빠른 시일 내에 드시기 바랍니다. 
          해동된 제품은 재냉동하지 마세요.
        </p>
      </div>
    </div>
  )
}

