'use client'

import { Product } from '@/lib/supabase/supabase'

interface ProductBottomBarProps {
  product: Product
  productId: string
  isWished: boolean
  soldOut: boolean
  onWishlistToggle: () => void
  onBuyClick: () => void
  onCartClick: () => void
  onPromotionClick: () => void
  /** true면 고정이 아닌 문서 흐름 안에 배치 (PC용) */
  staticPosition?: boolean
}

export default function ProductBottomBar({
  product,
  productId,
  isWished,
  soldOut,
  onWishlistToggle,
  onBuyClick,
  onCartClick,
  onPromotionClick,
  staticPosition = false,
}: ProductBottomBarProps) {
  if (soldOut) {
    return null
  }

  return (
    <div
      className={
        staticPosition
          ? 'w-full mt-6'
          : 'fixed bottom-0 left-0 right-0 z-40'
      }
      style={staticPosition ? undefined : { paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <div className="w-full flex justify-center">
        <div className={`w-full bg-white shadow-lg ${staticPosition ? 'border border-gray-200 rounded-lg' : 'max-w-[480px] border-t border-gray-200'}`}>
          {/* BOGO 골라담기 버튼 (활성화된 프로모션 상품일 때만 표시) */}
          {product.promotion?.is_active && product.promotion?.type === 'bogo' && product.promotion?.buy_qty && (
            <div className="border-b border-gray-200">
              <button
                onClick={onPromotionClick}
                className="w-full py-3 bg-pink-100 text-pink-700 text-base font-bold hover:bg-pink-200 transition flex items-center justify-center gap-2"
              >
                <span>🎁</span>
                <span>{product.promotion.buy_qty}+1 골라담기</span>
              </button>
            </div>
          )}
          
          {/* 찜 / 바로구매 / 장바구니 버튼 */}
          <div className="px-0 pt-0 pb-0 flex gap-0">
            <button
              onClick={onWishlistToggle}
              className="flex items-center justify-center bg-white py-3 hover:bg-gray-100 transition border border-gray-200"
              style={{ width: '15%' }}
              aria-label="찜하기"
            >
              {isWished ? (
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              )}
            </button>
            <button
              onClick={onBuyClick}
              className="bg-gray-900 text-white py-3 text-base font-semibold hover:bg-gray-800"
              style={{ width: '35%' }}
            >
              바로구매
            </button>
            <button
              onClick={onCartClick}
              className="bg-red-600 text-white py-3 text-base font-semibold hover:bg-red-600"
              style={{ width: '50%' }}
            >
              장바구니
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

