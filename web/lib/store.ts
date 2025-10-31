import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl: string
  discount_percent?: number
  brand?: string
  selected?: boolean
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  toggleSelect: (productId: string) => void
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
          const existingItem = state.items.find(
            (i) => i.productId === item.productId
          )
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity, discount_percent: item.discount_percent ?? i.discount_percent, brand: item.brand ?? i.brand, selected: item.selected ?? i.selected ?? true }
                  : { ...i, selected: i.selected ?? true }
              ),
            }
          }
          return { 
            items: [
              ...state.items.map((i) => ({ ...i, selected: i.selected ?? true })),
              { ...item, selected: item.selected ?? true }
            ]
          }
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        })),
      toggleSelect: (productId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, selected: !(i.selected ?? true) } : i
          ),
        })),
      toggleSelectAll: (selected) =>
        set((state) => ({
          items: state.items.map((i) => ({ ...i, selected })),
        })),
      clearCart: () => set({ items: [] }),
      getTotalPrice: () => {
        const items = get().items.filter((item) => item.selected !== false)
        return items.reduce((total, item) => {
          const unitPrice = item.discount_percent && item.discount_percent > 0
            ? Math.round(item.price * (100 - item.discount_percent) / 100)
            : item.price
          return total + unitPrice * item.quantity
        }, 0)
      },
      getSelectedItems: () => {
        return get().items.filter((item) => item.selected !== false)
      },
      getTotalItems: () => {
        const items = get().items
        return items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => {
        // 서버 사이드에서는 localStorage가 없으므로 체크
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

