'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import FreeShippingProgress from '@/components/common/FreeShippingProgress'
import PromotionModalWrapper from '@/components/common/PromotionModalWrapper'
import { isSoldOut } from '@/lib/product/product-utils'
import { useCart } from '@/lib/cart'
import { formatPhoneNumber } from '@/lib/utils/format-phone'
import CartHeader from './_components/CartHeader'
import DeliveryMethodSelector from './_components/DeliveryMethodSelector'
import CartItemList from './_components/CartItemList'
import OrderSummary from './_components/OrderSummary'
import AddressModal from './_components/AddressModal'
import LoginPromptModal from './_components/LoginPromptModal'

function CartPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  
  const {
    mounted,
    items,
    user,
    isMobile,
    allSelected,
    groupedItems,
    showLoginPrompt,
    showAddressModal,
    selectedAddressId,
    deliveryMethod,
    pickupTime,
    quickDeliveryArea,
    quickDeliveryTime,
    isKakaoGiftAvailable,
    defaultAddress,
    loadingAddress,
    allAddresses,
    loadingAddresses,
    getTotalPrice,
    getSelectedItems,
    toggleSelect,
    toggleSelectGroup,
    toggleSelectAll,
    setDeliveryMethod,
    setPickupTime,
    setQuickDeliveryArea,
    setQuickDeliveryTime,
    setShowLoginPrompt,
    setShowAddressModal,
    setSelectedAddressId,
    handleSelectAddress,
    confirmAddressSelection,
    handleCheckout,
    handleGiftCheckout,
    openAddressModal,
    removeCartItemWithDB,
    updateCartQuantityWithDB,
  } = useCart()

  return (
    <div className="min-h-screen flex flex-col">
      <CartHeader />

      <main className="flex-1 container mx-auto px-2 pt-2 pb-0 md:pb-32">
        {/* 배송지 정보 */}
        {!loadingAddress && user && items.length > 0 && (
          <div className="mb-3 bg-white rounded-lg px-3 py-2">
            {defaultAddress ? (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900">
                      {defaultAddress.address.split('(')[0].trim()}
                    </h3>
                    {defaultAddress.is_default && (
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">기본</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {defaultAddress.address}
                    {defaultAddress.address_detail && ` ${defaultAddress.address_detail}`}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {defaultAddress.recipient_name} | {formatPhoneNumber(defaultAddress.recipient_phone)}
                  </p>
                </div>
                <button
                  onClick={openAddressModal}
                  className="ml-4 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-600 rounded-md hover:bg-blue-50 transition whitespace-nowrap"
                >
                  배송지 변경
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">등록된 배송지가 없습니다</p>
                <button
                  onClick={() => router.push('/profile/addresses')}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-600 rounded-md hover:bg-blue-50 transition"
                >
                  배송지 등록
                </button>
              </div>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-32 md:py-40">
            <p className="text-xl text-gray-600 mb-6">장바구니가 비어있습니다.</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-white text-red-600 border border-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 장바구니 아이템 */}
            <div className="lg:col-span-2">
              <DeliveryMethodSelector
                deliveryMethod={deliveryMethod}
                onDeliveryMethodChange={setDeliveryMethod}
                pickupTime={pickupTime}
                onPickupTimeChange={setPickupTime}
                quickDeliveryArea={quickDeliveryArea}
                onQuickDeliveryAreaChange={setQuickDeliveryArea}
                quickDeliveryTime={quickDeliveryTime}
                onQuickDeliveryTimeChange={setQuickDeliveryTime}
              />

              {/* 전체 선택 체크박스 */}
              <div className="bg-white pt-4 pb-4 border-b border-gray-300">
                <div className="flex items-center pl-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-5 h-5 border-gray-300 focus:ring-red-600 accent-red-600"
                      style={{ accentColor: '#dc2626' }}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900">전체선택</span>
                  </label>
                </div>
              </div>

              {/* 무료배송 진행률 바 */}
              {deliveryMethod === 'regular' && (
                <div className="py-3 pb-4 border-b border-gray-300">
                  <FreeShippingProgress 
                    totalPrice={getTotalPrice()} 
                    deliveryMethod={deliveryMethod}
                  />
                </div>
              )}

              <CartItemList
                groupedItems={groupedItems}
                userId={user?.id}
                onToggleSelect={toggleSelect}
                onToggleSelectGroup={toggleSelectGroup}
                onRemoveItem={removeCartItemWithDB}
                onUpdateQuantity={updateCartQuantityWithDB}
              />
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-1">
              <OrderSummary
                selectedItems={getSelectedItems()}
                deliveryMethod={deliveryMethod}
                pickupTime={pickupTime}
                quickDeliveryArea={quickDeliveryArea}
                quickDeliveryTime={quickDeliveryTime}
              />
              <div className="hidden lg:block mt-2">
                <button
                  onClick={handleCheckout}
                  className="w-full bg-red-600 text-white py-3 text-base font-medium hover:bg-red-600"
                  suppressHydrationWarning
                >
                  주문하기 ({mounted ? getSelectedItems().filter(item => !isSoldOut(item.status)).reduce((total, item) => total + item.quantity, 0) : 0})
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 하단 고정 액션 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[480px] bg-white shadow-lg px-0 pb-0 flex gap-0">
            {deliveryMethod === 'regular' && (
              <button
                type="button"
                onClick={handleGiftCheckout}
                className="bg-gray-900 text-white py-3 text-base font-medium flex items-center justify-center gap-1 hover:bg-gray-800"
                style={{ width: '35%' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <span>선물하기</span>
              </button>
            )}
            <button
              onClick={handleCheckout}
              className={`bg-red-600 text-white py-3 text-base font-medium hover:bg-red-600 ${deliveryMethod === 'regular' && isMobile ? '' : 'w-full'}`}
              style={{ width: deliveryMethod === 'regular' && isMobile ? '65%' : '100%' }}
              suppressHydrationWarning
            >
              주문하기 ({mounted ? getSelectedItems().filter(item => !isSoldOut(item.status)).reduce((total, item) => total + item.quantity, 0) : 0})
            </button>
          </div>
        </div>
      </div>

      <PromotionModalWrapper />

      <AddressModal
        show={showAddressModal}
        onClose={() => {
          setShowAddressModal(false)
          setSelectedAddressId(null)
        }}
        addresses={allAddresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={handleSelectAddress}
        onConfirm={confirmAddressSelection}
        loading={loadingAddresses}
      />

      <LoginPromptModal
        show={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />

      <Footer />
      {pathname !== '/cart' && <BottomNavbar />}
    </div>
  )
}

export default function CartPageClientWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  )
}


