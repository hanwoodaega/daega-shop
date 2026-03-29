import { Product } from '../_types'

interface ProductTableProps {
  products: Product[]
  togglingSoldOut: string | null
  onEdit: (product: Product) => void
  onToggleSoldOut: (productId: string, currentStatus: string) => void
  onRemove: (productId: string) => void
}

export default function ProductTable({
  products,
  togglingSoldOut,
  onEdit,
  onToggleSoldOut,
  onRemove,
}: ProductTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-100">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-500">
          <tr>
            <th className="p-3 text-left">상품명</th>
            <th className="p-3 text-left">카테고리</th>
            <th className="p-3 text-center">과세/면세</th>
            <th className="p-3 text-right">가격</th>
            <th className="p-3 text-center">작업</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-neutral-100">
              <td className="p-3">
                <div className="font-medium text-neutral-900">{product.name}</div>
                <p className="text-xs text-neutral-500">{product.brand || '브랜드미지정'}</p>
              </td>
              <td className="p-3 text-neutral-600">{product.category}</td>
              <td className="p-3 text-center">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    product.tax_type === 'tax_free'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-slate-50 text-slate-700 border border-slate-100'
                  }`}
                >
                  {product.tax_type === 'tax_free' ? '면세' : '과세'}
                </span>
              </td>
              <td className="p-3 text-right">
                {Number(product.price).toLocaleString('ko-KR')}원
              </td>
              <td className="p-3 text-center space-x-2">
                <button
                  onClick={() => onEdit(product)}
                  className="text-xs text-neutral-500 hover:underline"
                >
                  수정
                </button>
                <button
                  onClick={() => onToggleSoldOut(product.id, product.status || 'active')}
                  disabled={togglingSoldOut === product.id}
                  className={`text-xs hover:underline ${
                    product.status === 'soldout' || product.status === 'deleted'
                      ? 'text-orange-600'
                      : 'text-gray-600'
                  }`}
                >
                  {togglingSoldOut === product.id
                    ? '처리중...'
                    : product.status === 'soldout'
                    ? '품절취소'
                    : product.status === 'deleted'
                    ? '판매재개'
                    : '품절처리'}
                </button>
                {product.status !== 'deleted' && (
                  <button
                    onClick={() => onRemove(product.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    삭제
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

