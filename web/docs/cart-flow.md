# 장바구니에 상품이 들어가는/설정되는 모든 경로

## 규칙 (단순화 원칙)

- **규칙 A) Source of truth**
  - 로그인 전: 로컬이 진짜. 로그인 후: **서버가 진짜**(로컬은 캐시), 서버에서 받은 결과로만 덮어쓴다.
- **규칙 B) 동기화는 “딱 1번”만**
  - **merge는 로그인 순간 1회** → `/api/auth/bootstrap` 한 곳에서만.
  - 그 외에는 merge 없이 **항상 서버 → 클라 덮어쓰기**만 (requestId 가드로 최신 응답만 반영).

**setState 허용 경로 (2개)**  
1. **앱 시작·게스트**: persist rehydrate  
2. **로그인 후/세션 복원**: bootstrap 결과로 setState  

**최소화**  
- useCartRealtimeSync / syncCartOnLogin: merge 하지 않음. 서버 조회 후 setState는 requestId 가드로 “최신만” 반영.

---

## 1. DB에 넣는 곳 (INSERT / POST)

| 위치 | 조건 | 설명 |
|------|------|------|
| **POST `/api/cart`** (`app/api/cart/route.ts`) | 로그인 사용자가 장바구니 추가 요청 | 단일 행 INSERT. `addToCartDB()` → 이 API 호출. |
| **POST `/api/auth/bootstrap`** (`app/api/auth/bootstrap/route.ts`) | `body.cart` 배열이 있을 때 | **merge는 여기 한 곳만.** 클라이언트가 게스트 장바구니(`id`가 `cart-`로 시작하는 항목)를 보내면 서버에서 DB에 merge 후 최신 목록 반환. |

- **클라이언트에서 POST `/api/cart`를 호출하는 곳**: `lib/cart/cart-db.ts`의 `addToCartDB()` 한 곳.
- `addToCartDB()`를 호출하는 곳: **`addCartItemWithDB()`** 만 (ProductCard, ProductDetailPageClient, PromotionModal, RecommendationSection).  
  ~~syncCartOnLogin~~ → merge 제거됨. merge는 bootstrap만.

---

## 2. 스토어/로컬에 “추가”하는 곳 (addItem / setState로 목록에 추가·덮어쓰기)

| 위치 | 설명 |
|------|------|
| **`lib/store.ts`** `addItem()` | Zustand 액션. 새 항목 추가 또는 기존 일반 상품 수량 증가. |
| **`lib/cart/cart-db.ts`** | |
| → `addCartItemWithDB()` | `store.addItem(item)` 호출 후, 로그인 시 `addToCartDB()` 호출. |
| → `syncCartOnLogin()` | merge 없음. `loadCartFromDB()` 결과로 setState + localStorage 덮어쓰기만 (서버 → 클라). |
| **`lib/auth/auth-context.tsx`** | |
| → Bootstrap 응답 처리 (3곳) | `bootstrap.sync?.cart?.done && Array.isArray(cartItems)` 일 때 `setCartItems(cartItems, 'bootstrap')` → 스토어만 갱신. 저장은 **persist**가 담당. 로그인/세션 복원 시 **서버 장바구니로 덮어씀**. |
| **`lib/cart/useCartRealtimeSync.ts`** | |
| → `loadCart()` | `loadCartFromDB()` 후 requestId 가드로 **최신 응답만** `setCartItems`. 저장은 persist만. |

- **`addItem`을 호출하는 UI**:  
  `ProductCard`, `ProductDetailPageClient`, `PromotionModal`, `RecommendationSection` → 모두 `addCartItemWithDB(user?.id ?? null, item)` 사용.

---

## 3. 스토어를 “다시 채우는” 경우 (목록 갱신·복원)

| 경로 | 시점 | 비고 |
|------|------|------|
| **Bootstrap (auth-context)** | 로그인/세션 확인 후 `runPostLoginBootstrap()` 성공 시 | `sync.cart.items`로 스토어 + `cart-storage` 덮어씀. |
| **syncCartOnLogin (cart-db)** | `useCartRealtimeSync`에서 `syncedUserIdRef.current !== userId` 일 때 (예: 장바구니 페이지 첫 마운트) | **merge 없음.** `loadCartFromDB()` 결과로 `setCartItems` → 스토어만. 저장은 persist. |
| **loadCart (useCartRealtimeSync)** | 같은 userId로 이미 동기화된 뒤, focus/visibilitychange/Realtime 이벤트 시 | `loadCartFromDB()` 결과로 `setCartItems`. 저장은 persist만. |
| **Zustand persist** | 앱 로드 시 rehydrate, 스토어 변경 시 저장 | **단일 저장 경로**: `setCartItems`는 스토어만 갱신, **persist만** localStorage에 기록 (이중 저장 금지). 키: `cart-storage:guest` / `cart-storage:${userId}`. |

---

## 4. 삭제 후 다시 보일 수 있는 원인 후보

1. **GET `/api/cart` 캐시**  
   브라우저/Next가 GET 응답을 캐시하면, 삭제 반영 전 목록이 `loadCartFromDB()`로 다시 들어올 수 있음.  
   → **대응**: `loadCartFromDB()`에서 `cache: 'no-store'` + 쿼리 캐시버스팅 (예: `?t=<timestamp>`).

2. **Persist / 이중 저장**  
   `setCartItems`에서 localStorage를 직접 쓰면 persist와 이중 저장되어, 어떤 순간의 상태가 잘못 박제되고 두 번째 새로고침에서 부활할 수 있음.  
   → **대응**: `setCartItems`는 **스토어만** 갱신. 저장은 persist에만 맡김. 로그인 시 키 분리(`cart-storage:guest` / `cart-storage:${userId}`).

3. **장바구니 페이지 재진입 시 syncCartOnLogin 재실행**  
   `useCartRealtimeSync`가 마운트될 때마다 `syncedUserIdRef`가 초기값이라, 매번 `syncCartOnLogin(userId)`가 실행됨.  
   이때 로컬 항목은 “guest 전용만” merge하므로, 이미 삭제된 서버 항목(UUID)이 로컬에 남아 있지 않다면 DB에서 다시 넣지는 않음.  
   단, **이때 쓰는 `loadCartFromDB()` 결과가 캐시된 예전 목록**이면 (1)과 동일 문제.

---

## 5. setCartItems(items, source) 통일

스토어 + localStorage 덮어쓰기는 **한 함수로만** 수행해 경합과 포맷 불일치를 막음.

- **위치**: `lib/cart/cart-db.ts` → `setCartItems(items, source)`
- **역할**: `useCartStore.setState({ items })` 만 수행. **localStorage 직접 쓰기 없음** — 저장은 Zustand persist만 담당 (이중 저장 시 rehydrate/저장 꼬임 방지).
- **persist 실제 저장 포맷**: Zustand persist + `createJSONStorage`는 **`{ state: S, version?: number }`** 형태로 저장함. 즉 localStorage 값은 `JSON.stringify({ state: { items: [...] }, version: 0 })` 이어야 함.  
  **과거에 `setCartItems`에서 `localStorage.setItem(key, JSON.stringify({ items }))`로 직접 썼다면** 포맷이 불일치함. rehydrate 시 persist는 `getItem` → `JSON.parse` 후 `deserializedStorageValue.state`를 쓰는데, `{ items }`만 있으면 `.state`가 없어서 merge가 비일관적으로 동작하고, **삭제된 상태(0)가 저장소에 제대로 반영되지 않거나 이전 스냅샷이 다시 rehydrate되는** 원인이 될 수 있음. → 그래서 **저장은 persist 한 곳만** 하도록 함.
- **persist 키**: `lib/cart/cart-storage-key.ts`의 `getCartStorageKey()` → `cart-storage:guest` 또는 `cart-storage:${userId}`. rehydrate는 auth보다 먼저 실행되므로, auth 전에는 `currentUserId`가 null이라 기본값으로 guest를 쓰면 로그인 유저가 `cart-storage:userId`에 flush한 0을 못 읽고 guest 옛 데이터가 복원됨. → `setCartStorageUserId` 시 `cart-storage-suffix`에 userId(또는 'guest')를 저장하고, `getCartStorageKey()`에서 auth 전에는 이 값을 읽어 같은 키로 rehydrate.
- **호출처**: `bootstrap`(auth-context 3곳), `loadCart`(useCartRealtimeSync), `deleteSuccess` / `clearSuccess`(cart-db), `signOut`(auth-context)

---

## 6. 적용한 수정 요약

- **`loadCartFromDB()`**: GET 요청에 `?t=${Date.now()}` 캐시버스팅 + **GET /api/cart 응답**에 `Cache-Control: no-store, max-age=0`, `Pragma: no-cache` 추가.
- **`removeCartItemWithDB()` / `clearCartWithDB()`**: 성공 시 **`setCartItems(..., 'deleteSuccess'|'clearSuccess')`** 후 **`flushCartPersist(items)`** 호출. persist는 비동기/배치라 삭제 직후 새로고침에 밀릴 수 있으므로, 성공 시점에 persist가 쓰는 키·포맷(`{ state, version }`) 그대로 즉시 저장해 "두 번째 새로고침 부활" 방지.
- **이중 저장 제거 + 키 분리**: `setCartItems`에서 localStorage 직접 setItem 제거. persist만 저장. 로그인 시 `cart-storage:${userId}`, 게스트 시 `cart-storage:guest`로 키 분리 (`lib/cart/cart-storage-key.ts`, auth에서 `setCartStorageUserId` 호출).
- **과거 고정 키 찌꺼기 제거**: 실제 키는 `getCartStorageKey()`인데, 예전에 직접 썼던 고정 키 `cart-storage`가 남아 있으면 혼선/재주입 가능. `cart-storage-key.ts` 로드 시 `localStorage.removeItem('cart-storage')` 1회 실행.
- **bootstrap merge 1회만**: `bootstrapCartSentRef`로 cart/wishlist 전송은 세션당 1회만.
- **bootstrap setCartItems 반영: 최신 호출만**: (1) `bootstrapCallIdRef`로 stale 응답 스킵(myCallId !== current). (2) 적용 시 `hasSyncedRef`(boolean)만 쓰면 먼저 도착한 응답이 true를 세워 최신 응답 적용이 막힘 → `lastAppliedBootstrapIdRef`(적용된 callId)로 **myCallId > lastAppliedBootstrapIdRef**일 때만 적용. 최신 호출만 통과 + 최신만 적용 두 겹으로 결정성 확보.
- **`useCartRealtimeSync`**: `loadCart()`에 **requestId 가드** — 최신 요청만 `setCartItems(dbItems, 'loadCart')` 반영.
- **근본 원인(삭제 후 새로고침 시 다시 찬 현상)**: 삭제 전에 나간 GET /api/cart 요청(포커스/visibility/syncCartOnLogin)이 삭제 **이후**에 도착해, 응답(예: 5개)으로 `setCartItems(5)`가 호출되어 0을 덮어씀 → localStorage가 5로 바뀌고, 새로고침 시 bootstrap merge로 DB에 5개 재주입. **수정**: 삭제/비우기 **시작 시** 진행 중인 GET을 `AbortController`로 취소(`registerAbortLoadCart` → `loadCartFromDB(signal)`).

---

## 8. bootstrap 이후에 스토어를 덮어쓸 수 있는 두 경로

**1) loadCart()가 bootstrap 뒤에 setCartItems 하는지**

- **loadCart()**는 `useCartRealtimeSync` 안에서 **마운트 시에는 호출되지 않음**. `focus`, `visibilitychange`, Realtime 이벤트에서만 `scheduleLoadCart()` → `loadCart()` 호출.
- 따라서 **새로고침 직후**에는 loadCart()가 bootstrap 뒤에 실행될 일은 없음. 사용자가 탭 전환 등으로 focus/visibility가 나중에 발생하면 그때 loadCart()가 돌고, **requestId 가드**로 최신 요청만 `setCartItems` 함.
- **syncCartOnLogin**은 마운트 시 `syncedUserIdRef.current !== userId`이고 `!getBootstrapHasSetCartThisSession()`일 때 호출됨. bootstrap과 거의 동시에 돌 수 있어서, **둘 다** setCartItems를 호출함. 서버가 source of truth이므로 둘 다 같은 서버 값(0)을 받으면 결과는 0. 캐시된 5가 오면 문제인데, GET no-cache + 삭제 시 abort로 완화됨.

**2) rehydrate가 bootstrap보다 늦게 실행되는지**

- Zustand persist **rehydrate**는 스토어를 **처음 구독하는 컴포넌트**가 마운트될 때 비동기로 시작함. (여러 페이지/헤더에서 `useCartStore` 구독 → 앱 초기 렌더에서 곧바로 시작.)
- **bootstrap**은 AuthProvider effect에서 `checkSession` / `onAuthStateChange`가 끝난 뒤 적용됨. 즉 rehydrate와 bootstrap은 **동시에 진행**될 수 있고, **rehydrate가 늦게 끝나면** rehydrate 결과로 스토어를 덮어쓸 수 있음.
- 이걸 막기 위해: (1) **삭제 직후** `flushCartPersist([])`로 persist 키에 0을 씀. (2) **키 분리** + **cart-storage-suffix**로 auth 전에도 `cart-storage:${userId}`를 읽어서, 로그인 유저는 삭제 후 flush한 0이 rehydrate에 사용됨.  
→ rehydrate가 bootstrap보다 늦게 끝나도, rehydrate가 읽는 값이 이미 0이면 스토어가 0으로 유지됨.

---

## 9. 재현 시 바로 확인할 것

**A) 삭제 직후 localStorage**  
삭제 버튼 누른 뒤 콘솔에서 (키는 로그인 시 `cart-storage:${userId}`, 비로그인 시 `cart-storage:guest`):
```js
// 예: 게스트
localStorage.getItem('cart-storage:guest')
// 예: 로그인 사용자
localStorage.getItem('cart-storage:' + '현재 userId')
```
- 비어 있는데 새로고침하면 다시 찬다 → GET/캐시 쪽.
- 삭제 직후에도 예전 값이 남아 있다 → persist 경로 문제(삭제 함수가 해당 경로를 안 타거나, persist가 그 직후 다시 덮어쓴 것).

---

## 10. 재현 결과 정리 (캐시가 원인인 경우)

- **localStorage만 삭제 후 새로고침** → 여전히 다시 생김 → persist만의 문제 아님.
- **Network "Disable cache" 후 새로고침** → 다시 생김 → 브라우저가 GET 응답을 어딘가에 캐시한 상태.
- **Application "Clear site data" 후** → 안 생김 → 캐시(또는 전체 저장소) 제거 시 정상.

→ **GET /api/cart 응답이 캐시되어 예전 목록이 돌아오는 것이 원인.**  
대응: GET 응답에 캐시 방지 헤더 강화 (`no-store`, `no-cache`, `must-revalidate`, `Expires: 0`).
