# 장바구니 API 호출 방식 가이드

이 문서는 장바구니 관련 API의 호출 방식과 사용 패턴을 정리한 문서입니다.

## 장바구니 흐름 (비로그인 → 로그인)

**원칙**
- 로그아웃 상태: 장바구니는 **로컬(브라우저 localStorage)** 에만 저장.
- 로그인 시: 서버 장바구니와 **1회만 merge** (같은 상품은 **수량 합산**, 한 행으로 표시).
- merge 후: 스토어는 **서버 결과만** 사용 → 로컬은 서버와 동일하게 유지(실질적으로 로컬 장바구니 비움).

**동작**
1. **Auth bootstrap** (`POST /api/auth/bootstrap?includeSync=1`): 클라이언트가 로컬 장바구니를 보내면, 서버가 DB와 병합(기존 행 있으면 수량만 더함, 없으면 insert) 후 병합된 목록을 응답. (1.2초 타임아웃 있음)
2. **useCartRealtimeSync** (장바구니/결제 등): 로그인 사용자 **첫 로드 시** `syncCartOnLogin(userId)` 호출 → 로컬 항목을 `POST /api/cart`로 넣고(기존 상품이면 API가 수량만 증가), 이어서 서버에서 전체 조회해 스토어를 그 결과로 갱신.
3. 이후 포커스/탭 복귀/Realtime: DB만 조회해 스토어 갱신.

## 📋 장바구니 API 목록

### 1. `GET /api/cart` - 장바구니 조회

**용도:** 사용자의 장바구니 목록을 조회합니다.

**인증:** 필요 (로그인한 사용자만)

**응답 형식:**
```typescript
{
  success: true,
  items: CartItem[]
}
```

**CartItem 구조:**
```typescript
{
  id: string,                    // 장바구니 항목 ID
  productId: string,             // 상품 ID
  slug: string | null,           // 상품 슬러그
  name: string,                  // 상품명
  price: number,                 // 상품 가격
  quantity: number,              // 수량
  imageUrl: string,              // 상품 이미지 URL
  discount_percent?: number,     // 할인율
  brand?: string,                // 브랜드
  promotion_type?: string,        // 프로모션 타입 (예: "2+1")
  promotion_group_id?: string,   // 프로모션 그룹 ID
  selected: boolean,             // 선택 여부
  status: string                 // 상품 상태
}
```

**호출 위치:**
- `lib/cart/cart-db.ts` - `loadCartFromDB()`
- `lib/cart/useCartRealtimeSync.ts` - 실시간 동기화 시 호출

**사용 예시:**
```typescript
// 직접 호출
const res = await fetch('/api/cart')
const data = await res.json()
const items = data.items || []

// 서비스 함수 사용
import { loadCartFromDB } from '@/lib/cart/cart-db'

const items = await loadCartFromDB(userId)
```

**특징:**
- 상품 정보, 프로모션 정보, 이미지 URL을 포함하여 반환
- 삭제된 상품(`status: 'deleted'`)은 자동으로 필터링
- 최신 업데이트 순으로 정렬 (`updated_at` 기준)

---

### 2. `POST /api/cart` - 장바구니에 상품 추가

**용도:** 장바구니에 상품을 추가합니다. 기존 상품이 있으면 수량을 증가시킵니다.

**인증:** 필요 (로그인한 사용자만)

**요청 본문:**
```typescript
{
  product_id: string,              // 필수: 상품 ID
  quantity: number,                 // 필수: 수량
  promotion_type?: string,          // 선택: 프로모션 타입
  promotion_group_id?: string,      // 선택: 프로모션 그룹 ID
  discount_percent?: number         // 선택: 할인율
}
```

**응답 형식:**
```typescript
{
  success: true,
  message: '장바구니에 추가되었습니다.',
  data: CartItem,
  updated?: boolean                 // true: 수량 증가, false: 새로 추가
}
```

**호출 위치:**
- `lib/cart/cart-db.ts` - `addToCartDB()`
- `lib/cart/cart-db.ts` - `addCartItemWithDB()` (간접 호출)

**사용 예시:**
```typescript
// 직접 호출
const res = await fetch('/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 'product-id',
    quantity: 1,
    discount_percent: 10
  })
})

// 서비스 함수 사용
import { addCartItemWithDB } from '@/lib/cart/cart-db'

await addCartItemWithDB(userId, {
  productId: 'product-id',
  name: '상품명',
  price: 10000,
  quantity: 1,
  imageUrl: 'image-url',
  discount_percent: 10
})
```

**특징:**
- **일반 상품:** 기존 상품이 있으면 수량 증가, 없으면 새로 추가
- **프로모션 상품:** `promotion_group_id`가 있으면 항상 새로 추가 (중복 허용)
- **Optimistic Update:** UI는 즉시 업데이트하고 서버 요청은 백그라운드에서 처리

---

### 3. `PATCH /api/cart` - 장바구니 수량 수정

**용도:** 장바구니 항목의 수량을 수정합니다.

**인증:** 필요 (로그인한 사용자만)

**요청 본문:**
```typescript
{
  id: string,        // 필수: 장바구니 항목 ID
  quantity: number   // 필수: 새로운 수량
}
```

**응답 형식:**
```typescript
{
  success: true,
  message: '수량이 수정되었습니다.',
  data: CartItem
}
```

**호출 위치:**
- `lib/cart/cart-db.ts` - `updateCartQuantityDB()`
- `lib/cart/cart-db.ts` - `updateCartQuantityWithDB()` (간접 호출)

**사용 예시:**
```typescript
// 직접 호출
const res = await fetch('/api/cart', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'cart-item-id',
    quantity: 3
  })
})

// 서비스 함수 사용
import { updateCartQuantityWithDB } from '@/lib/cart/cart-db'

await updateCartQuantityWithDB(userId, 'cart-item-id', 3)
```

**특징:**
- **Optimistic Update:** UI는 즉시 업데이트하고 서버 요청은 백그라운드에서 처리
- 실패 시 자동 롤백

---

### 4. `DELETE /api/cart` - 장바구니에서 상품 제거

**용도:** 장바구니에서 상품을 제거합니다.

**인증:** 필요 (로그인한 사용자만)

**요청 본문:**
```typescript
{
  id?: string,                    // 일반 상품: 장바구니 항목 ID
  promotion_group_id?: string     // 프로모션 상품: 프로모션 그룹 ID
}
```

**응답 형식:**
```typescript
{
  success: true,
  message: '장바구니에서 제거되었습니다.'
}
```

**호출 위치:**
- `lib/cart/cart-db.ts` - `removeFromCartDB()`
- `lib/cart/cart-db.ts` - `removeCartItemWithDB()` (간접 호출)

**사용 예시:**
```typescript
// 직접 호출
const res = await fetch('/api/cart', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'cart-item-id'
  })
})

// 프로모션 그룹 전체 삭제
const res = await fetch('/api/cart', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    promotion_group_id: 'promotion-group-id'
  })
})

// 서비스 함수 사용
import { removeCartItemWithDB } from '@/lib/cart/cart-db'

await removeCartItemWithDB(userId, 'cart-item-id', 'promotion-group-id')
```

**특징:**
- **일반 상품:** `id`로 개별 항목 삭제
- **프로모션 상품:** `promotion_group_id`로 같은 그룹의 모든 상품 삭제
- **Optimistic Update:** UI는 즉시 업데이트하고 서버 요청은 백그라운드에서 처리
- 실패 시 자동 롤백

---

## 🔄 호출 패턴 및 흐름

### 1. 장바구니 추가 (Optimistic Update)

**위치:** `lib/cart/cart-db.ts` - `addCartItemWithDB()`

**호출 흐름:**
```
사용자가 상품 추가 버튼 클릭
  ↓
addCartItemWithDB() 호출
  ↓
1. Optimistic Update: 즉시 UI 업데이트 (Zustand store)
  ↓
2. 로그인 확인
  ↓ (로그인한 경우)
3. POST /api/cart 호출
  ↓
4. 응답 받아서 DB ID로 업데이트
  ↓ (실패 시)
5. 롤백: 이전 상태로 복원
```

**코드 예시:**
```typescript
export async function addCartItemWithDB(userId: string | null, item: CartItem): Promise<void> {
  const store = useCartStore.getState()
  const previousItems = store.items
  
  // 1. Optimistic update: 즉시 UI 업데이트
  store.addItem(item)
  
  // 2. DB 저장 (로그인 시만)
  if (userId) {
    try {
      const dbId = await addToCartDB(userId, item)
      
      if (dbId) {
        // DB ID로 업데이트
        const currentItems = useCartStore.getState().items
        const lastItem = currentItems[currentItems.length - 1]
        
        // 임시 ID를 DB ID로 교체
        if (lastItem && lastItem.id?.startsWith('cart-')) {
          useCartStore.setState({
            items: currentItems.map((i, idx) => 
              idx === currentItems.length - 1 ? { ...i, id: dbId } : i
            )
          })
        }
      } else {
        // DB 저장 실패 시 롤백
        useCartStore.setState({ items: previousItems })
        toast.error('장바구니 추가에 실패했습니다.')
      }
    } catch (error) {
      // 에러 발생 시 롤백
      useCartStore.setState({ items: previousItems })
      toast.error('장바구니 추가에 실패했습니다.')
    }
  }
}
```

---

### 2. 장바구니 조회 및 실시간 동기화

**위치:** `lib/cart/useCartRealtimeSync.ts`

**호출 흐름:**
```
컴포넌트 마운트 (장바구니 페이지 등)
  ↓
useCartRealtimeSync() 훅 실행
  ↓
1. 초기 로드: GET /api/cart
  ↓
2. Supabase Realtime 구독 시작
  ↓
3. 상품 가격/할인율 변경 감지
  ↓
4. 자동 갱신: GET /api/cart
  ↓
5. 페이지 포커스 시 갱신 (다른 탭에서 돌아올 때)
```

**코드 예시:**
```typescript
export function useCartRealtimeSync(userId: string | undefined, productIdsString: string) {
  useEffect(() => {
    if (!userId) return

    const loadCart = async () => {
      const dbItems = await loadCartFromDB(userId)
      useCartStore.setState({ items: dbItems })
    }
    
    // 초기 로드
    loadCart()
    
    // 페이지 포커스 시 갱신
    const handleFocus = () => {
      loadCart()
    }
    window.addEventListener('focus', handleFocus)
    
    // Supabase Realtime 구독
    if (productIds.length > 0) {
      const channel = supabase
        .channel(`product-price-changes-${userId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `id=in.(${productIds.join(',')})`
        }, (payload) => {
          // 상품 가격이나 할인율이 변경되면 장바구니 갱신
          if (payload.new.price !== payload.old?.price || 
              payload.new.discount_percent !== payload.old?.discount_percent) {
            loadCart()
          }
        })
        .subscribe()
    }

    return () => {
      window.removeEventListener('focus', handleFocus)
      supabase.removeChannel(channel)
    }
  }, [userId, productIdsString])
}
```

---

### 3. 로그인 시 장바구니 동기화

**위치:** `lib/cart/cart-db.ts` - `syncCartOnLogin()`

**호출 흐름:**
```
사용자 로그인
  ↓
syncCartOnLogin() 호출
  ↓
1. localStorage의 장바구니 항목 가져오기
  ↓
2. GET /api/cart로 DB 장바구니 조회
  ↓
3. localStorage에만 있는 항목들을 DB에 추가 (POST /api/cart)
  ↓
4. DB의 최신 데이터로 전체 동기화 (GET /api/cart)
  ↓
5. Zustand store 업데이트
```

**코드 예시:**
```typescript
export async function syncCartOnLogin(userId: string): Promise<void> {
  const localItems = useCartStore.getState().items
  const dbItems = await loadCartFromDB(userId)
  let hasAddedItems = false

  // localStorage에만 있는 항목들을 DB에 추가
  for (const item of localItems) {
    const existsInDB = dbItems.some(dbItem => 
      dbItem.productId === item.productId && 
      dbItem.promotion_group_id === item.promotion_group_id
    )

    if (!existsInDB) {
      await addToCartDB(userId, item)
      hasAddedItems = true
    }
  }

  // 항목이 추가되었을 때만 DB에서 다시 가져오기
  if (hasAddedItems) {
    const updatedItems = await loadCartFromDB(userId)
    useCartStore.setState({ items: updatedItems })
  } else {
    useCartStore.setState({ items: dbItems })
  }
}
```

---

## 📊 API 호출 시점 요약

| API | 호출 시점 | 호출 위치 | Optimistic Update |
|-----|----------|----------|-------------------|
| `GET /api/cart` | 장바구니 페이지 진입 시 | `useCartRealtimeSync` | ❌ |
| `GET /api/cart` | 로그인 시 동기화 | `syncCartOnLogin` | ❌ |
| `GET /api/cart` | 상품 가격 변경 시 (Realtime) | `useCartRealtimeSync` | ❌ |
| `GET /api/cart` | 페이지 포커스 시 | `useCartRealtimeSync` | ❌ |
| `POST /api/cart` | 상품 추가 시 | `addCartItemWithDB` | ✅ |
| `PATCH /api/cart` | 수량 수정 시 | `updateCartQuantityWithDB` | ✅ |
| `DELETE /api/cart` | 상품 제거 시 | `removeCartItemWithDB` | ✅ |

---

## 🔒 인증 및 보안

### 인증 방식

모든 장바구니 API는 **Supabase Auth**를 사용하여 인증합니다:

```typescript
// 서버 사이드 인증
const user = await getUserFromServer()
if (!user) {
  return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
}
```

### 보안 특징

1. **HttpOnly 쿠키:** 세션 토큰이 JavaScript에서 접근 불가
2. **서버 사이드 검증:** 모든 요청은 서버에서 사용자 인증 확인
3. **사용자별 데이터 격리:** `user_id`로 필터링하여 본인 장바구니만 조회/수정 가능
4. **에러 처리:** 인증 실패 시 적절한 에러 응답 반환

---

## 💡 사용 패턴

### 패턴 1: 상품 추가 (Optimistic Update)

```typescript
import { addCartItemWithDB } from '@/lib/cart/cart-db'
import { useAuth } from '@/lib/auth/auth-context'

function ProductCard({ product }) {
  const { user } = useAuth()

  const handleAddToCart = () => {
    const cartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.image_url,
      discount_percent: product.discount_percent
    }

    // Optimistic Update: 즉시 UI 업데이트 후 DB 저장
    addCartItemWithDB(user?.id || null, cartItem)
    toast.success('장바구니에 추가되었습니다!')
  }

  return <button onClick={handleAddToCart}>장바구니에 담기</button>
}
```

### 패턴 2: 장바구니 페이지에서 수량 수정

```typescript
import { updateCartQuantityWithDB } from '@/lib/cart/cart-db'
import { useAuth } from '@/lib/auth/auth-context'

function CartItem({ item }) {
  const { user } = useAuth()

  const handleQuantityChange = (newQuantity: number) => {
    // Optimistic Update: 즉시 UI 업데이트 후 DB 저장
    updateCartQuantityWithDB(user?.id || null, item.id, newQuantity)
  }

  return (
    <div>
      <button onClick={() => handleQuantityChange(item.quantity - 1)}>-</button>
      <span>{item.quantity}</span>
      <button onClick={() => handleQuantityChange(item.quantity + 1)}>+</button>
    </div>
  )
}
```

### 패턴 3: 장바구니에서 상품 제거

```typescript
import { removeCartItemWithDB } from '@/lib/cart/cart-db'
import { useAuth } from '@/lib/auth/auth-context'

function CartItem({ item }) {
  const { user } = useAuth()

  const handleRemove = () => {
    // Optimistic Update: 즉시 UI 업데이트 후 DB 삭제
    removeCartItemWithDB(user?.id || null, item.id, item.promotion_group_id)
    toast.success('장바구니에서 제거되었습니다.')
  }

  return <button onClick={handleRemove}>삭제</button>
}
```

### 패턴 4: 장바구니 페이지에서 실시간 동기화

```typescript
import { useCartRealtimeSync } from '@/lib/cart/useCartRealtimeSync'
import { useCartStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'

function CartPage() {
  const { user } = useAuth()
  const items = useCartStore((state) => state.items)
  
  // 상품 ID 목록을 문자열로 변환 (의존성 배열용)
  const productIdsString = items.map(item => item.productId).join(',')

  // 실시간 동기화: 상품 가격 변경 시 자동 갱신
  useCartRealtimeSync(user?.id, productIdsString)

  return (
    <div>
      {items.map(item => (
        <CartItem key={item.id} item={item} />
      ))}
    </div>
  )
}
```

---

## ⚠️ 주의사항

### 1. Optimistic Update 패턴

장바구니 추가/수정/삭제는 **Optimistic Update** 패턴을 사용합니다:

- **장점:** 사용자 경험 향상 (즉시 반응)
- **주의:** 실패 시 롤백 로직 필요
- **구현:** 이전 상태를 저장하고 실패 시 복원

### 2. 비로그인 사용자 처리

비로그인 사용자는 **localStorage**에만 저장하고 API를 호출하지 않습니다:

```typescript
// 로그인한 경우만 DB 저장
if (userId) {
  await addToCartDB(userId, item)
}
```

### 3. 프로모션 그룹 처리

프로모션 상품은 `promotion_group_id`로 그룹화됩니다:

- **추가:** 같은 그룹의 상품도 개별적으로 추가 가능
- **삭제:** 그룹 ID로 삭제하면 같은 그룹의 모든 상품 삭제
- **선택:** 그룹 단위로 선택/해제 가능

### 4. 실시간 동기화 최적화

**Supabase Realtime**을 사용하여 상품 가격 변경 시 자동 갱신:

- 장바구니에 있는 상품 ID만 구독
- 가격 또는 할인율 변경 시에만 갱신
- 페이지 포커스 시에도 갱신 (다른 탭에서 돌아올 때)

### 5. 임시 ID 처리

비로그인 사용자가 추가한 항목은 임시 ID(`cart-{timestamp}`)를 사용합니다:

- 로그인 시 DB에 저장하고 실제 ID로 교체
- DB ID는 UUID 형식이므로 `startsWith('cart-')`로 구분

---

## 🔍 디버깅 팁

### 1. 네트워크 탭에서 확인

브라우저 개발자 도구의 Network 탭에서 다음 API 호출을 확인할 수 있습니다:

- `GET /api/cart` - 장바구니 조회
- `POST /api/cart` - 상품 추가
- `PATCH /api/cart` - 수량 수정
- `DELETE /api/cart` - 상품 제거

### 2. Zustand Store 상태 확인

```typescript
import { useCartStore } from '@/lib/store'

// 현재 장바구니 상태 확인
const items = useCartStore.getState().items
console.log('장바구니 항목:', items)

// 총 가격 확인
const totalPrice = useCartStore.getState().getTotalPrice()
console.log('총 가격:', totalPrice)
```

### 3. 콘솔 로그 확인

에러 발생 시 서버 콘솔에 다음 로그가 출력됩니다:

```
[API] 장바구니 조회 실패: [에러 내용]
장바구니 추가 실패: [에러 내용]
장바구니 수량 수정 실패: [에러 내용]
장바구니 제거 실패: [에러 내용]
```

### 4. 인증 상태 확인

장바구니가 표시되지 않는다면:

1. 사용자가 로그인했는지 확인 (`user?.id` 존재 여부)
2. Supabase 세션이 유효한지 확인
3. 서버 콘솔에서 인증 에러 확인

---

## 📚 관련 파일

- **API 라우트:**
  - `app/api/cart/route.ts` - 장바구니 CRUD API

- **서비스 함수:**
  - `lib/cart/cart-db.ts` - 장바구니 DB 연동 함수

- **훅:**
  - `lib/cart/cart.hooks.ts` - `useCart` 훅
  - `lib/cart/useCartRealtimeSync.ts` - 실시간 동기화 훅

- **타입:**
  - `lib/cart/cart.types.ts` - 장바구니 타입 정의
  - `lib/store.ts` - Zustand store (CartItem 타입 포함)

- **컴포넌트:**
  - `app/cart/CartPageClient.tsx` - 장바구니 페이지 클라이언트 컴포넌트

---

## 🎯 주요 특징 요약

1. **Optimistic Update:** 모든 추가/수정/삭제는 즉시 UI 업데이트 후 DB 저장
2. **실시간 동기화:** Supabase Realtime으로 상품 가격 변경 시 자동 갱신
3. **비로그인 지원:** localStorage에 저장하고 로그인 시 동기화
4. **프로모션 지원:** 프로모션 그룹 단위로 관리
5. **에러 처리:** 실패 시 자동 롤백 및 사용자 알림

