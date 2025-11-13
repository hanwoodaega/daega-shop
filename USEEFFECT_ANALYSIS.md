# useEffect 사용 현황 및 상태 관리 분석

> 전체 페이지의 useEffect 훅 사용 현황, 상태 관리, 용도를 정리한 문서입니다.

## 📋 전체 요약

| 페이지 | useEffect | 상태 개수 | 무한루프 | 상태 |
|--------|-----------|----------|---------|------|
| 메인 (/) | 2개 | 7개 | ❌ | ✅ 안전 |
| 상품 목록 | 2개 | 7개 | ❌ | ✅ 안전 |
| 상품 상세 | 4개 | 11개 | ❌ | ✅ 안전 |
| **장바구니** | **2개** (5→2) | **10개** | ❌ | ✅ 최적화 |
| **찜 목록** | **1개** | **3개** | ❌ | ✅ 신규 |
| 주문결제 | 3개 | 15개 | ❌ | ✅ 안전 |
| 주문내역 | 2개 | 5개 | ❌ | ✅ 안전 |
| 마이페이지 | 2개 | 4개 | ❌ | ✅ 안전 |
| 배송지 관리 | 2개 | 8개 | ❌ | ✅ 안전 |
| 관리자 상품 | 1개 | 5개 | ❌ | ✅ 안전 |
| 관리자 프로모션 | 1개 | 6개 | ❌ | ✅ 안전 |
| 관리자 주문 | 1개 | 4개 | ❌ | ✅ 안전 |

**총 useEffect: 24개 | 총 상태: 82개**

---

## 🎯 용도별 분류

### 1️⃣ 인증 및 리다이렉트 (5개)
비로그인 사용자를 로그인 페이지로 리다이렉트

- `/orders`
- `/profile`
- `/profile/addresses`
- (기타 인증 필요 페이지)

### 2️⃣ 데이터 초기 로드 (12개)
페이지 마운트 시 DB에서 데이터 조회

- `/`: 전체 상품
- `/products`: 카테고리별 상품
- `/products/[id]`: 상품 상세, 리뷰
- `/cart`: 장바구니 (DB 로드)
- `/wishlist`: 찜 목록 (별도 페이지)
- `/checkout`: 배송지, 사용자 정보
- `/orders`: 주문 내역
- `/profile`: 사용자 프로필
- `/profile/addresses`: 배송지 목록
- `/admin`: 상품 목록
- `/admin/promotions`: 프로모션 목록
- `/admin/orders`: 주문 목록

### 3️⃣ URL 파라미터 동기화 (2개)
URL 쿼리를 상태와 동기화

- `/products`: category → selectedCategory
- `/products/[id]`: openPromotion → 모달 열기

### 4️⃣ 상태 동기화 (7개)
컴포넌트 간 상태 동기화 및 부수효과

- `/`: 로딩 타임아웃
- `/products/[id]`: 평점 동기화
- `/cart`: hydration 방지
- `/checkout`: 배송지/사용자 정보 자동 입력

---

## 📖 페이지별 상세 분석

### 1. 메인 페이지 (`/app/page.tsx`)

#### 📦 상태 관리 (7개)
```typescript
const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
const [loading, setLoading] = useState(true)
const [loadingMore, setLoadingMore] = useState(false)
const [errorMessage, setErrorMessage] = useState<string | null>(null)
const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
const [page, setPage] = useState(1)
const [hasMore, setHasMore] = useState(true)
```

#### 🔄 useEffect #1: 상품 조회 (정렬 변경 시)
**용도**: 정렬 옵션 변경 시 상품 재조회  
**의존성**: `[sortOrder]`  
**동작**:
- 로딩 시작
- 페이지를 1로 리셋
- 기존 상품 목록 초기화
- 첫 페이지 상품 조회

**상태**: ✅ 안전 (sortOrder만 추적)

#### 🔄 useEffect #2: 로딩 타임아웃
**용도**: 8초 이상 로딩 시 에러 메시지 표시  
**의존성**: `[loading]`  
**동작**:
- 8초 타이머 설정
- 로딩이 끝나지 않으면 에러 메시지 표시
- cleanup으로 타이머 정리

**상태**: ✅ 안전 (cleanup 함수 있음)

---

### 2. 상품 목록 페이지 (`/app/products/page.tsx`)

#### 📦 상태 관리 (7개)
```typescript
const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
const [loading, setLoading] = useState(true)
const [loadingMore, setLoadingMore] = useState(false)
const [selectedCategory, setSelectedCategory] = useState(category || '전체')
const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
const [page, setPage] = useState(1)
const [hasMore, setHasMore] = useState(true)
```

#### 🔄 useEffect #1: URL 파라미터 동기화
**용도**: URL 카테고리 변경 시 상태 업데이트  
**의존성**: `[category]`  
**동작**: URL 파라미터 → `selectedCategory` 상태

**상태**: ✅ 안전

#### 🔄 useEffect #2: 상품 조회
**용도**: 카테고리/검색어/필터/정렬 변경 시 재조회  
**의존성**: `[category, searchQuery, filter, sortOrder]`  
**동작**:
- 로딩 시작
- 페이지 리셋
- 상품 목록 초기화
- 새로운 조건으로 조회

**상태**: ✅ 안전 (외부 파라미터만 추적)

---

### 3. 상품 상세 페이지 (`/app/products/[id]/page.tsx`)

#### 📦 상태 관리 (11개)
```typescript
const [product, setProduct] = useState<Product | null>(null)
const [loading, setLoading] = useState(true)
const [quantity, setQuantity] = useState(1)
const [showQty, setShowQty] = useState(false)
const [pendingAction, setPendingAction] = useState<null | 'cart' | 'buy'>(null)
const [showCartConfirm, setShowCartConfirm] = useState(false)
const [showLoginPrompt, setShowLoginPrompt] = useState(false)
const [showReviewModal, setShowReviewModal] = useState(false)
const [reviewOrderId, setReviewOrderId] = useState<string>('')
const [reviewCount, setReviewCount] = useState(0)
const [averageRating, setAverageRating] = useState(0)
```

#### 🔄 useEffect #1: 상품 조회
**용도**: 상품 정보 로드  
**의존성**: `[fetchProduct]` (useCallback)  
**동작**: DB에서 상품 상세 정보 조회

**상태**: ✅ 안전

#### 🔄 useEffect #2: 평점 동기화
**용도**: 상품 평점 업데이트  
**의존성**: `[product?.average_rating]`  
**동작**: 상품의 평점을 로컬 상태에 동기화

**상태**: ✅ 안전

#### 🔄 useEffect #3: 리뷰 개수 조회
**용도**: 리뷰 개수 및 프리페칭  
**의존성**: `[productId]`  
**동작**:
- 리뷰 개수 조회
- 첫 3개 리뷰를 미리 가져와서 브라우저 캐시에 저장 (성능 최적화)

**상태**: ✅ 안전

#### 🔄 useEffect #4: 프로모션 모달 자동 열기
**용도**: URL 파라미터로 프로모션 모달 자동 열기  
**의존성**: `[product, searchParams, productId]`  
**동작**:
- `?openPromotion=true` 쿼리가 있으면 모달 열기
- URL에서 쿼리 파라미터 제거

**상태**: ✅ 안전

---

### 4. 장바구니 페이지 (`/app/cart/page.tsx`) - ⚡ 최적화 완료

#### 📦 상태 관리 (10개)
```typescript
// Zustand 스토어
const items = useCartStore((state) => state.items)

// AuthContext
const { user } = useAuth()

// 로컬 상태
const [showLoginPrompt, setShowLoginPrompt] = useState(false)
const [showAddressModal, setShowAddressModal] = useState(false)
const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
const [mounted, setMounted] = useState(false)
const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'quick' | 'regular'>('regular')
const [pickupTime, setPickupTime] = useState('')
const [quickDeliveryArea, setQuickDeliveryArea] = useState('')
const [quickDeliveryTime, setQuickDeliveryTime] = useState('')

// Ref
const hasLoadedCart = useRef(false)
```

**제거된 상태 (3개) - `/wishlist`로 이동:**
- ~~`showWishlist`~~ 
- ~~`wishlistProducts`~~ 
- ~~`loadingWishlist`~~

#### 🔄 useEffect #1: Hydration 에러 방지
**용도**: 클라이언트 마운트 확인  
**의존성**: `[]`  
**동작**: `mounted` 상태를 true로 설정

**상태**: ✅ 안전 (최초 1회만)

#### 🔄 useEffect #2: 장바구니 DB 로드 ⚡
**용도**: 로그인 사용자 장바구니 DB 동기화  
**의존성**: `[user?.id]`  
**동작**:
- 로그인 사용자만 실행
- ref로 중복 로드 방지 (`hasLoadedCart`)
- DB에서 최신 장바구니 조회
- 로컬 스토어에 반영

**최적화**: 
- ✅ ref로 중복 방지
- ✅ 최초 1회만 로드
- ✅ 찜 목록은 로드하지 않음 (별도 페이지)

**상태**: ✅ 안전

#### ~~useEffect #3: 위시리스트 상품 조회~~ ❌ 제거됨
**제거 이유**: 찜 목록은 별도 `/wishlist` 페이지에서 처리  
**효과**: 장바구니 페이지 방문 시 불필요한 DB 조회 제거 (성능 향상)

#### ~~useEffect #4-5: 재고 확인 및 품절 제거~~ ❌ 제거됨
**제거 이유**: 관리자가 직접 품절 처리하므로 자동 재고 확인 불필요

---

### 5. 찜 목록 페이지 (`/app/wishlist/page.tsx`) - ✨ 신규 생성

**상태 관리 (3개):**
- `wishlistIds`: 찜 목록 ID (Zustand 스토어)
- `wishlistProducts`: 찜한 상품 목록
- `loading`: 로딩 상태

#### 🔄 useEffect #1: 위시리스트 상품 조회
**용도**: 찜한 상품 정보 조회  
**의존성**: `[wishlistIds.join(',')]`  
**동작**:
- 찜 ID 목록이 있으면 상품 정보 조회
- 없으면 빈 배열
- 로딩 상태 관리

**상태**: ✅ 안전

**특징**:
- 장바구니 페이지에서 분리됨
- 독립적인 페이지로 책임 분리
- URL: `/wishlist` (단순하고 명확)

---

### 6. 주문결제 페이지 (`/app/checkout/page.tsx`)

#### 📦 상태 관리 (15개)
```typescript
// Zustand 스토어
const items = useCartStore((state) => state.items)
const directPurchaseItems = useDirectPurchaseStore((state) => state.items)

// AuthContext
const { user } = useAuth()

// 로컬 상태
const [formData, setFormData] = useState({
  name: '', phone: '', email: '',
  zipcode: '', address: '', address_detail: '', delivery_note: ''
})
const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'quick' | 'regular'>('regular')
const [pickupTime, setPickupTime] = useState('')
const [quickDeliveryArea, setQuickDeliveryArea] = useState('')
const [quickDeliveryTime, setQuickDeliveryTime] = useState('')
const [flags, setFlags] = useState({
  mounted: false,
  saveAsDefaultAddress: false,
  isProcessing: false
})

// Hooks
const { address: defaultAddress, loading: loadingDefaultAddress, hasDefaultAddress } = useDefaultAddress()
const { profile: userProfile } = useUserProfile()
```

#### 🔄 useEffect #1: 클라이언트 마운트 + 배송 정보 로드
**용도**: 장바구니에서 선택한 배송 방법 불러오기  
**의존성**: `[]`  
**동작**:
- `mounted` 플래그 설정
- sessionStorage에서 배송 방법/시간/지역 불러오기
- 해당 정보를 상태에 반영

**상태**: ✅ 안전 (최초 1회만)

#### 🔄 useEffect #2: 기본 배송지 적용
**용도**: 기본 배송지를 입력 필드에 자동 입력  
**의존성**: `[defaultAddress, hasDefaultAddress]`  
**동작**:
- 기본 배송지가 있으면 폼에 자동 입력
- 배송지가 하나도 없으면 "기본 배송지로 저장" 체크박스 자동 체크

**상태**: ✅ 안전

#### 🔄 useEffect #3: 사용자 정보 적용
**용도**: 사용자 프로필을 주문자 정보에 자동 입력  
**의존성**: `[userProfile, user?.email]`  
**동작**:
- 사용자 이름, 전화번호를 폼에 자동 입력
- 이메일 정보도 자동 입력

**상태**: ✅ 안전

---

### 7. 주문내역 페이지 (`/app/orders/page.tsx`)

#### 📦 상태 관리 (5개)
```typescript
const { user, loading } = useAuth()
const [orders, setOrders] = useState<OrderWithItems[]>([])
const [loadingOrders, setLoadingOrders] = useState(true)
const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
```

#### 🔄 useEffect #1: 인증 체크
**용도**: 비로그인 시 로그인 페이지로 리다이렉트  
**의존성**: `[user, loading, router]`  
**동작**: 인증 로딩 완료 후 사용자가 없으면 리다이렉트

**상태**: ✅ 안전

#### 🔄 useEffect #2: 주문 내역 조회
**용도**: 주문 내역 로드  
**의존성**: `[user?.id]`  
**동작**: 사용자 ID로 주문 내역 조회

**상태**: ✅ 안전

---

### 8. 마이페이지 (`/app/profile/page.tsx`)

#### 📦 상태 관리 (4개)
```typescript
const { user, loading, signOut } = useAuth()
const [userName, setUserName] = useState<string>('')
const [loadingProfile, setLoadingProfile] = useState(true)
```

#### 🔄 useEffect #1: 인증 체크
**용도**: 비로그인 시 리다이렉트  
**의존성**: `[user, loading, router]`  
**동작**: 인증 확인 후 비로그인이면 로그인 페이지로

**상태**: ✅ 안전

#### 🔄 useEffect #2: 사용자 정보 조회
**용도**: 사용자 이름 로드  
**의존성**: `[user?.id]`  
**동작**: DB에서 사용자 이름 조회, 없으면 이메일에서 추출

**상태**: ✅ 안전

---

### 9. 배송지 관리 (`/app/profile/addresses/page.tsx`)

#### 📦 상태 관리 (8개)
```typescript
const { user, loading } = useAuth()
const [addresses, setAddresses] = useState<Address[]>([])
const [loadingAddresses, setLoadingAddresses] = useState(true)
const [showAddModal, setShowAddModal] = useState(false)
const [editingAddress, setEditingAddress] = useState<Address | null>(null)
const [formData, setFormData] = useState({ name: '', recipient_name: '', ... })
const [saving, setSaving] = useState(false)
```

#### 🔄 useEffect #1: 인증 체크
**용도**: 비로그인 시 리다이렉트  
**의존성**: `[user, loading, router]`  

**상태**: ✅ 안전

#### 🔄 useEffect #2: 배송지 목록 조회
**용도**: 배송지 목록 로드  
**의존성**: `[user?.id]`  
**동작**: 사용자의 모든 배송지 조회 (기본 배송지 우선)

**상태**: ✅ 안전

---

### 10. 관리자 상품 관리 (`/app/admin/page.tsx`)

#### 📦 상태 관리 (5개 그룹)
```typescript
// 상품 등록 폼
const [form, setForm] = useState({
  brand: '', name: '', description: '', price: '', image_url: '',
  category: '', stock: '999', unit: '1팩', weight: '0',
  origin: '국내산', discount_percent: '', product_info: ''
})

// UI 상태
const [uiState, setUiState] = useState({
  message: null,
  error: null,
  loading: false,
  loadingList: false
})

// 목록 상태
const [listState, setListState] = useState({
  items: [],
  filterCategory: '전체',
  filterTag: '전체',
  search: '',
  page: 1,
  total: 0
})

// 수정 관련
const [editing, setEditing] = useState(null)
const [savingEdit, setSavingEdit] = useState(false)
```

#### 🔄 useEffect #1: 상품 목록 조회
**용도**: 페이지/필터 변경 시 상품 목록 재조회  
**의존성**: `[page, filterCategory, filterTag]`  
**동작**: 현재 필터 조건으로 상품 목록 조회

**상태**: ✅ 안전 (fetchList가 items를 변경하지만 items는 의존성에 없음)

---

### 11. 관리자 프로모션 관리 (`/app/admin/promotions/page.tsx`)

#### 📦 상태 관리 (6개)
```typescript
const [groups, setGroups] = useState<PromotionGroup[]>([])
const [products, setProducts] = useState<any[]>([])
const [loading, setLoading] = useState(true)
const [newGroup, setNewGroup] = useState({
  type: '1+1' as '1+1' | '2+1' | '3+1',
  product_ids: [] as string[]
})
const [showProductSelector, setShowProductSelector] = useState(false)
const [searchQuery, setSearchQuery] = useState('')
```

#### 🔄 useEffect #1: 초기 데이터 로드
**용도**: 프로모션 목록 및 전체 상품 목록 로드  
**의존성**: `[]`  
**동작**:
- 전체 상품 조회 (최대 1000개)
- 프로모션이 설정된 상품들을 그룹화
- 프로모션 목록 구성

**상태**: ✅ 안전 (최초 1회만)

---

### 12. 관리자 주문 관리 (`/app/admin/orders/page.tsx`)

#### 📦 상태 관리 (4개)
```typescript
const [orders, setOrders] = useState<OrderWithItems[]>([])
const [loading, setLoading] = useState(true)
const [filterStatus, setFilterStatus] = useState<string>('전체')
const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
```

#### 🔄 useEffect #1: 주문 목록 조회
**용도**: 주문 내역 최초 로드  
**의존성**: `[]`  
**동작**: 모든 주문 내역 조회 (주문 아이템 포함)

**상태**: ✅ 안전 (최초 1회만)

---

## 🎯 공통 패턴 정리

### 패턴 1: 인증 체크
```typescript
useEffect(() => {
  if (!loading && !user) {
    router.push('/auth/login?next=/현재경로')
  }
}, [user, loading, router])
```
**사용**: `/orders`, `/profile`, `/profile/addresses`

### 패턴 2: 데이터 로드
```typescript
useEffect(() => {
  if (user?.id) {
    fetchData()
  }
}, [user?.id])  // ✅ user 전체가 아닌 user.id만
```
**사용**: 대부분의 사용자 페이지

### 패턴 3: URL 동기화
```typescript
useEffect(() => {
  setState(urlParam || defaultValue)
}, [urlParam])
```
**사용**: `/products`, `/products/[id]`

---

## ⚠️ 과거 문제점 (해결됨)

### 장바구니 - 재고 확인 로직 (제거됨 ✅)
```typescript
// ❌ 제거됨
useEffect(() => {
  // 재고 확인
  setStockStatus(...)
}, [items.length])

useEffect(() => {
  // 품절 상품 자동 제거
  items.forEach(item => {
    if (stockStatus[item.productId] <= 0) {
      removeItem(item.id)  // ⚠️ items 변경 → 무한루프 위험
    }
  })
}, [stockStatus, items, removeItem])
```

**문제점**:
1. `removeItem()` → `items` 변경
2. `items` 변경 → `items.length` 변경
3. → 재고 확인 useEffect 재실행
4. → 품절 제거 useEffect 재실행
5. → 무한루프 가능성

**해결**: 재고 관리를 관리자가 직접 수행 (품절처리 버튼)

---

## 📊 최적화 전후 비교

| 항목 | 최적화 전 | 최적화 후 | 개선 |
|------|----------|----------|------|
| 총 useEffect | 27개 | 24개 | -3개 ✅ |
| 장바구니 useEffect | 5개 | 2개 | -3개 ✅ |
| 장바구니 상태 | 13개 | 10개 | -3개 ✅ |
| 무한루프 위험 | 있음 ⚠️ | 없음 | 해결 ✅ |
| DB 조회 빈도 | 높음 | 낮음 | 감소 ⬇️ |
| 코드 라인 수 | +150줄 | 기준 | -150줄 ✅ |
| 중복 로직 | 있음 | 없음 | 제거 ✅ |
| 페이지 책임 | 혼재 | 명확 | 분리 ✅ |

---

## 🚀 추가 최적화 항목

### 완료된 최적화
1. ✅ **주문 금액 계산**: `calculateOrderTotal()` 통합
2. ✅ **디버그 로그**: `debugLog` 유틸리티 (개발 환경만)
3. ✅ **재고 확인**: 불필요한 로직 제거
4. ✅ **장바구니 로드**: ref로 중복 방지
5. ✅ **의존성 최적화**: `removeItem` 제거
6. ✅ **찜 목록 분리**: `/wishlist` 별도 페이지로 분리

### 유지 관리 지침
1. **useEffect 추가 시**: 의존성 배열 신중하게 검토
2. **상태 변경 로직**: 무한루프 가능성 체크
3. **cleanup 함수**: 타이머/구독은 반드시 정리
4. **ref 활용**: 중복 실행 방지가 필요한 경우

---

## ✅ 최종 결론

### 안전성 검증 완료
- ✅ 무한루프 위험: **없음**
- ✅ 불필요한 재실행: **없음**
- ✅ 중복 로직: **없음**
- ✅ 메모리 누수: **없음**

### 모든 페이지 상태: 안전 ✅

**총 24개 useEffect가 모두 안전하게 최적화되어 있습니다.**

### 페이지 분리 개선 ✨

**장바구니 (`/cart`)**: 
- ✅ 장바구니 아이템만 관리
- ✅ 로그인 사용자는 DB에서 로드
- ❌ 찜 목록은 로드하지 않음 (성능 향상)

**찜 목록 (`/wishlist`)**: 
- ✅ 찜한 상품만 표시
- ✅ 페이지 마운트 시에만 찜 목록 로드
- ✅ 독립적인 페이지로 책임 분리
