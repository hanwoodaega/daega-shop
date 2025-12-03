// 도드람한돈 삼겹살 상품고시정보

interface ProductInfoProps {
  productId: string
  productName?: string
}

export default function ProductInfoPorkbelly20mm({ productId, productName }: ProductInfoProps) {
  return (
    <div className="w-full">
      <table className="w-full border-collapse border border-gray-300">
        <tbody>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top w-1/3 border-r border-gray-300">제품명</td>
            <td className="py-3 px-2 text-gray-700">도드람한돈 삼겹살</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">식품의 유형</td>
            <td className="py-3 px-2 text-gray-700">식육(돼지고기)</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">생산자/소재지</td>
            <td className="py-3 px-2 text-gray-700">㈜도드람푸드 / 경기도 안성시 일죽면 일생로 185-9</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">제조연월일/포장일자</td>
            <td className="py-3 px-2 text-gray-700">상품 패키지 별도 표기</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">소비기한</td>
            <td className="py-3 px-2 text-gray-700">상품 패키지 별도 표기</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">중량</td>
            <td className="py-3 px-2 text-gray-700">700g</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">원재료 및 함량</td>
            <td className="py-3 px-2 text-gray-700">돼지고기(국내산) 100%</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">등급</td>
            <td className="py-3 px-2 text-gray-700">1등급</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">보관방법</td>
            <td className="py-3 px-2 text-gray-700">냉장보관(0~10℃)</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">품목보고번호</td>
            <td className="py-3 px-2 text-gray-700">상품 패키지 별도 표기</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">알레르기 정보</td>
            <td className="py-3 px-2 text-gray-700">돼지고기 함유</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-3 px-2 bg-gray-50 font-semibold text-gray-900 align-top border-r border-gray-300">소비자상담번호</td>
            <td className="py-3 px-2 text-gray-700">010-XXXX-XXXX(대가정육마트)</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

