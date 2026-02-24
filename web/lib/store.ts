import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from './supabase/supabase'
import { getCartStorageKey } from './cart/cart-storage-key'

export interface CartItem {
  id?: string  // 장바구니 아이템 고유 ID
  productId: string
  slug?: string | null  // 상품 slug (URL 생성용)
  name: string
  price: number
  quantity: number
  imageUrl: string | null
  discount_percent?: number
  brand?: string
  selected?: boolean
  promotion_type?: '1+1' | '2+1' | '3+1'
  free_product_id?: string  // 선택한 증정품 ID
  promotion_group_id?: string  // 프로모션 그룹 ID (같은 그룹끼리 묶음)
  status?: string | null  // 상품 상태 (active, soldout, deleted)
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  removeSelectedItems: () => void
  updateQuantity: (itemId: string, quantity: number) => void
  updateFreeProduct: (productId: string, freeProductId: string) => void
  toggleSelect: (itemId: string) => void
  toggleSelectGroup: (groupId: string) => void
  toggleSelectAll: (selected: boolean) => void
  clearCart: () => void
  getTotalPrice: () => number
  getSelectedItems: () => CartItem[]
  getTotalItems: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          // 고유 ID 생성
          const cartItemId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          
          // 프로모션 그룹이 있는 상품은 항상 새로 추가 (그룹별로 분리)
          if (item.promotion_group_id) {
            return { 
              items: [
                ...state.items.map((i) => ({ ...i, selected: i.selected ?? true })),
                { ...item, id: cartItemId, selected: item.selected ?? true }
              ]
            }
          }
          
          // 일반 상품은 기존 로직 유지
          const existingItem = state.items.find(
            (i) => i.productId === item.productId && !i.promotion_group_id
          )
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && !i.promotion_group_id
                  ? { 
                      ...i, 
                      quantity: i.quantity + item.quantity, 
                      discount_percent: item.discount_percent ?? i.discount_percent, 
                      brand: item.brand ?? i.brand,
                      selected: item.selected ?? i.selected ?? true
                    }
                  : { ...i, selected: i.selected ?? true }
              ),
            }
          }
          return { 
            items: [
              ...state.items.map((i) => ({ ...i, selected: i.selected ?? true })),
              { ...item, id: cartItemId, selected: item.selected ?? true }
            ]
          }
        }),
      removeSelectedItems: () =>
        set((state) => ({
          items: state.items.filter((i) => i.selected === false),
        })),
      removeItem: (itemId) =>
        set((state) => {
          const item = state.items.find(i => i.id === itemId)
          // 프로모션 그룹이 있으면 같은 그룹의 모든 상품 삭제
          if (item?.promotion_group_id) {
            return {
              items: state.items.filter(i => i.promotion_group_id !== item.promotion_group_id)
            }
          }
          // 일반 상품은 해당 아이템만 삭제
          return {
            items: state.items.filter((i) => i.id !== itemId),
          }
        }),
      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        })),
      updateFreeProduct: (productId, freeProductId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, free_product_id: freeProductId } : i
          ),
        })),
      toggleSelect: (itemId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, selected: !(i.selected ?? true) } : i
          ),
        })),
      toggleSelectGroup: (groupId) =>
        set((state) => {
          // 그룹의 현재 선택 상태 확인
          const groupItems = state.items.filter(i => i.promotion_group_id === groupId)
          const allSelected = groupItems.every(i => i.selected !== false)
          const newSelected = !allSelected
          
          return {
            items: state.items.map((i) =>
              i.promotion_group_id === groupId ? { ...i, selected: newSelected } : i
            ),
          }
        }),
      toggleSelectAll: (selected) =>
        set((state) => ({
          items: state.items.map((i) => ({ ...i, selected })),
        })),
      clearCart: () => set({ items: [] }),
      getTotalPrice: () => {
        const items = get().items.filter((item) => item.selected !== false && item.status !== 'soldout' && item.status !== 'deleted')
        return items.reduce((total, item) => {
          const unitPrice = item.discount_percent && item.discount_percent > 0
            ? Math.round(item.price * (100 - item.discount_percent) / 100)
            : item.price
          return total + unitPrice * item.quantity
        }, 0)
      },
      getSelectedItems: () => {
        return get().items.filter((item) => item.selected !== false && item.status !== 'soldout' && item.status !== 'deleted')
      },
      getTotalItems: () => {
        const items = get().items.filter(item => item.status !== 'soldout' && item.status !== 'deleted')
        // 구매 가능한 상품만 카운트 (품절/삭제 제외)
        return items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return {
          getItem: (name: string) => localStorage.getItem(getCartStorageKey()),
          setItem: (name: string, value: string) => localStorage.setItem(getCartStorageKey(), value),
          removeItem: (name: string) => localStorage.removeItem(getCartStorageKey()),
        }
      }),
    }
  )
)

// 직접구매 전용 세션 스토리지 store
interface DirectPurchaseStore {
  items: CartItem[]
  setItems: (items: CartItem[]) => void
  clearItems: () => void
  getTotalPrice: () => number
}

export const useDirectPurchaseStore = create<DirectPurchaseStore>()(
  persist(
    (set, get) => ({
      items: [],
      setItems: (items) => set({ items }),
      clearItems: () => set({ items: [] }),
      getTotalPrice: () => {
        const items = get().items
        return items.reduce((total, item) => {
          const unitPrice = item.discount_percent && item.discount_percent > 0
            ? Math.round(item.price * (100 - item.discount_percent) / 100)
            : item.price
          return total + unitPrice * item.quantity
        }, 0)
      },
    }),
    {
      name: 'direct-purchase-storage',
      storage: createJSONStorage(() => {
        // 서버 사이드에서는 sessionStorage가 없으므로 체크
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return sessionStorage
      }),
    }
  )
)

// 검색 UI 상태 관리 스토어
interface SearchUIStore {
  isSearchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
  toggleSearch: () => void
}

export const useSearchUIStore = create<SearchUIStore>()((set) => ({
  isSearchOpen: false,
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
}))

// 프로모션 모달 상태 관리 스토어
interface PromotionModalStore {
  isOpen: boolean
  productId: string | null
  openModal: (productId: string) => void
  closeModal: () => void
}

export const usePromotionModalStore = create<PromotionModalStore>()((set) => ({
  isOpen: false,
  productId: null,
  openModal: (productId: string) => set({ isOpen: true, productId }),
  closeModal: () => set({ isOpen: false, productId: null }),
}))

// 위시리스트(찜) 스토어
interface WishlistStore {
  items: string[] // 상품 ID 목록
  addItem: (productId: string) => void
  removeItem: (productId: string) => void
  toggleItem: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  clearWishlist: () => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (productId) =>
        set((state) => {
          if (state.items.includes(productId)) {
            return state
          }
          return { items: [...state.items, productId] }
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((id) => id !== productId),
        })),
      toggleItem: (productId) =>
        set((state) => {
          if (state.items.includes(productId)) {
            return { items: state.items.filter((id) => id !== productId) }
          }
          return { items: [...state.items, productId] }
        }),
      isInWishlist: (productId) => {
        return get().items.includes(productId)
      },
      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return localStorage
      }),
    }
  )
)

