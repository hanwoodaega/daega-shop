# useEffect 사용 현황 문서

이 문서는 프로젝트 내에서 `useEffect`가 어디에 어떻게 사용되는지 정리한 문서입니다.

## 목차
1. [라이브러리/훅 파일](#라이브러리훅-파일)
2. [컴포넌트 파일](#컴포넌트-파일)
3. [페이지 파일](#페이지-파일)
4. [사용 패턴 요약](#사용-패턴-요약)

---

## 라이브러리/훅 파일

### `lib/auth-context.tsx`
**목적**: 인증 상태 관리 및 초기화

```typescript
useEffect(() => {
  // 1. 초기 세션 확인
  supabase.auth.getSession().then(...)
  
  // 2. 인증 상태 변경 감지 (구독)
  const { subscription } = supabase.auth.onAuthStateChange(...)
  
  return () => subscription.unsubscribe() // cleanup: 구독 해제
}, [user])
```

**특징**:
- 의존성: `[user]`
- Cleanup: 구독 해제로 메모리 누수 방지
- 로그인 시 localStorage → DB 마이그레이션 처리

---

### `lib/hooks/useAddress.ts`

#### `useDefaultAddress` Hook
```typescript
useEffect(() => {
  if (!user?.id || !enabled) {
    setLoading(false)
    return
  }
  loadDefaultAddress()
}, [user?.id, enabled])
```

**특징**:
- 의존성: `[user?.id, enabled]`
- 기본 배송지 자동 로드
- 조건부 실행 (user가 있을 때만)

#### `useAddresses` Hook
```typescript
useEffect(() => {
  if (user?.id) {
    loadAddresses()
  }
}, [user?.id])
```

**특징**:
- 의존성: `[user?.id]`
- 모든 배송지 목록 로드

#### `useUserProfile` Hook
```typescript
useEffect(() => {
  if (!user?.id) {
    setLoading(false)
    return
  }
  loadProfile()
}, [user?.id])
```

**특징**:
- 의존성: `[user?.id]`
- 사용자 프로필 정보 로드

---

### `lib/hooks/useDaumPostcode.ts`
```typescript
useEffect(() => {
  // 이미 로드되어 있는지 확인
  if (window.daum) return

  // 스크립트 동적 로드
  const script = document.createElement('script')
  script.src = DAUM_POSTCODE_URL
  document.body.appendChild(script)

  return () => {
    // cleanup: 스크립트 제거
    if (document.body.contains(script)) {
      document.body.removeChild(script)
    }
  }
}, [])
```

**특징**:
- 의존성: `[]` (마운트 시 한 번만)
- 외부 스크립트 동적 로드
- Cleanup: 스크립트 제거

---

## 컴포넌트 파일

### `components/Header.tsx`
```typescript
useEffect(() => {
  if (!isSearchOpen) {
    // setSearchQuery('') // 필요시 활성화
  }
}, [isSearchOpen])
```

**특징**:
- 의존성: `[isSearchOpen]`
- 검색 모드 닫힐 때 상태 초기화 (현재는 주석 처리)

---

### `components/common/ScrollToTop.tsx`
```typescript
useEffect(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [handleScroll])
```

**특징**:
- 의존성: `[handleScroll]`
- 스크롤 이벤트 리스너 등록/해제
- Cleanup: 이벤트 리스너 제거

---

### `components/FlashSaleCountdown.tsx`
```typescript
useEffect(() => {
  if (remainingSeconds === null || remainingSeconds <= 0) {
    return
  }

  const interval = setInterval(() => {
    const newRemaining = getFlashSaleRemainingSeconds(product)
    setRemainingSeconds(newRemaining)
    
    if (newRemaining === null || newRemaining <= 0) {
      clearInterval(interval)
    }
  }, 1000)

  return () => clearInterval(interval)
}, [product, remainingSeconds])
```

**특징**:
- 의존성: `[product, remainingSeconds]`
- 1초마다 카운트다운 업데이트
- Cleanup: interval 정리

---

### `components/PromotionModal.tsx`

#### 프로모션 상품 로드
```typescript
useEffect(() => {
  const fetchPromotionProducts = async () => {
    if (!isOpen || !product?.promotion_type || !product?.promotion_products?.length) {
      setPromotionProducts([])
      return
    }
    // 프로모션 상품 데이터 로드
  }
  fetchPromotionProducts()
}, [isOpen, product?.id, product?.promotion_type, product?.promotion_products?.join(',')])
```

#### 모달 닫을 때 초기화
```typescript
useEffect(() => {
  if (!isOpen) {
    setPromoQuantities({})
  }
}, [isOpen])
```

**특징**:
- 모달 열릴 때 프로모션 상품 로드
- 모달 닫힐 때 상태 초기화

---

### `components/review/ReviewList.tsx`

#### 키보드 네비게이션 Hook
```typescript
useEffect(() => {
  if (!isOpen) return

  const handleKeyDown = (e: KeyboardEvent) => {
    // Arrow 키로 이미지 이동, Escape로 모달 닫기
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isOpen, onPrev, onNext, onClose])
```

#### 모달 열릴 때 스크롤 방지
```typescript
useEffect(() => {
  if (showImageModal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = 'unset'
  }
  return () => {
    document.body.style.overflow = 'unset'
  }
}, [showImageModal])
```

#### 리뷰 데이터 로드
```typescript
useEffect(() => {
  fetchProductData() // 상품 정보 로드
}, [productId])

useEffect(() => {
  let mounted = true
  
  const loadReviews = async () => {
    if (mounted) {
      await fetchReviews()
    }
  }
  
  loadReviews()
  
  return () => {
    mounted = false
  }
}, [fetchReviews])
```

**특징**:
- 키보드 이벤트 리스너 관리
- 모달 시 body 스크롤 제어
- 컴포넌트 언마운트 시 요청 취소 (mounted 플래그)

---

### `components/review/ReviewItem.tsx`
```typescript
useEffect(() => {
  // 이미지 로드 처리
}, [])

useEffect(() => {
  // 리뷰 데이터 변경 시 업데이트
}, [review])
```

---

### `components/FlashSaleSection.tsx`
```typescript
useEffect(() => {
  // 플래시 세일 상품 로드 및 자동 재로드
}, [])
```

---

### `components/RecentlyViewedSection.tsx`
```typescript
useEffect(() => {
  // 최근 본 상품 로드
}, [])
```

---

### `components/BottomNavbar.tsx`
```typescript
useEffect(() => {
  // 활성 라우트 감지
}, [])

useEffect(() => {
  // 라우트 변경 감지
}, [pathname])
```

---

### `components/PromotionModalWrapper.tsx`
```typescript
useEffect(() => {
  // 프로모션 모달 초기화
}, [])
```

---

### `components/DeliveryCompleteNotification.tsx`
```typescript
useEffect(() => {
  // 배송 완료 알림 표시 로직
}, [])
```

---

## 페이지 파일

### `app/page.tsx` (홈페이지)

#### 초기 로드 및 정렬 변경
```typescript
useEffect(() => {
  setLoading(true)
  setPage(1)
  setDisplayedProducts([])
  fetchProducts(1, sortOrder)
}, [sortOrder])
```

#### 로딩 타임아웃 처리
```typescript
useEffect(() => {
  if (!loading) return
  const timer = setTimeout(() => {
    if (loading) {
      setErrorMessage('상품 목록을 불러오는데 시간이 오래 걸립니다...')
      setLoading(false)
    }
  }, 8000)
  return () => clearTimeout(timer)
}, [loading])
```

#### 무한 스크롤 감지
```typescript
useEffect(() => {
  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
      loadMore()
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [loadMore])
```

**특징**:
- 정렬 변경 시 상품 재로드
- 로딩 타임아웃으로 UX 개선
- 무한 스크롤 구현

---

### `app/products/[id]/page.tsx` (상품 상세)

#### 상품 데이터 로드
```typescript
useEffect(() => {
  fetchProduct()
}, [fetchProduct])
```

#### 최근 본 상품 저장
```typescript
useEffect(() => {
  if (productId) {
    saveRecentlyViewed(productId)
  }
}, [productId])
```

#### 평균 평점 업데이트
```typescript
useEffect(() => {
  if (product?.average_rating !== undefined && product.average_rating !== null) {
    setAverageRating(product.average_rating)
  }
}, [product?.average_rating])
```

#### 리뷰 개수 로드 및 프리페칭
```typescript
useEffect(() => {
  const fetchReviewCount = async () => {
    // 리뷰 개수 조회 및 프리페칭
  }
  if (productId) {
    fetchReviewCount()
  }
}, [productId])
```

#### 프로모션 모달 자동 열기 (URL 파라미터)
```typescript
useEffect(() => {
  const openPromotion = searchParams?.get('openPromotion')
  if (openPromotion === 'true' && product?.promotion_type) {
    openPromotionModal(productId)
    // URL에서 쿼리 파라미터 제거
    const url = new URL(window.location.href)
    url.searchParams.delete('openPromotion')
    window.history.replaceState({}, '', url.toString())
  }
}, [searchParams, product?.promotion_type, productId, openPromotionModal])
```

---

### `app/cart/page.tsx` (장바구니)

#### Hydration 에러 방지
```typescript
useEffect(() => {
  setMounted(true)
}, [])
```

#### DB에서 장바구니 로드 및 실시간 가격 갱신
```typescript
useEffect(() => {
  if (!user?.id) return

  const loadCart = async () => {
    const dbItems = await loadCartFromDB(user.id)
    useCartStore.setState({ items: dbItems })
  }
  
  // 초기 로드
  loadCart()
  
  // 페이지 포커스 시 갱신
  const handleFocus = () => {
    loadCart()
  }
  window.addEventListener('focus', handleFocus)
  
  // Supabase Realtime 구독: 상품 가격/할인율 변경 시 장바구니 갱신
  const channel = supabase
    .channel(`product-price-changes-${user.id}`)
    .on('postgres_changes', { ... }, (payload) => {
      // 가격 변경 감지 시 장바구니 갱신
    })
    .subscribe()
  
  return () => {
    window.removeEventListener('focus', handleFocus)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }
  }
}, [user?.id, productIdsString])
```

**특징**:
- 실시간 가격 변경 감지 (Supabase Realtime)
- 페이지 포커스 시 데이터 갱신
- Cleanup: 이벤트 리스너 및 채널 제거

---

### `app/checkout/page.tsx` (결제 페이지)

#### 클라이언트 마운트 확인 및 배송 방법 불러오기
```typescript
useEffect(() => {
  setFlags(prev => ({ ...prev, mounted: true }))
  
  // 세션 스토리지에서 배송 방법 불러오기
  const savedDeliveryMethod = sessionStorage.getItem('deliveryMethod')
  // ...
}, [])
```

#### 기본 배송지 적용
```typescript
useEffect(() => {
  if (defaultAddress) {
    applyAddress(defaultAddress)
  } else if (!hasDefaultAddress) {
    setFlags(prev => ({ ...prev, saveAsDefaultAddress: true }))
  }
}, [defaultAddress, hasDefaultAddress])
```

#### 사용자 정보 적용
```typescript
useEffect(() => {
  if (userProfile) {
    setFormData(prev => ({
      ...prev,
      name: prev.name || userProfile.name || '',
      phone: prev.phone || userProfile.phone || '',
      email: prev.email || userProfile.email || user?.email || '',
    }))
  }
}, [userProfile, user?.email])
```

#### 사용 가능한 쿠폰 및 포인트 로드
```typescript
useEffect(() => {
  if (user?.id) {
    loadAvailableCoupons()
    loadUserPoints()
  }
}, [user?.id])
```

---

### `app/products/page.tsx` (상품 목록)
```typescript
useEffect(() => {
  // 검색어 변경 시 상품 목록 로드
}, [searchParams])

useEffect(() => {
  // 정렬 변경 시 재로드
}, [sortOrder])

useEffect(() => {
  // 무한 스크롤 감지
}, [loadMore])

useEffect(() => {
  // 카테고리 변경 감지
}, [category])
```

---

### `app/orders/page.tsx`
```typescript
useEffect(() => {
  // 주문 목록 로드
}, [user?.id])

useEffect(() => {
  // 주문 상태 필터 변경 시 재로드
}, [statusFilter])
```

---

### `app/profile/page.tsx`
```typescript
useEffect(() => {
  // 사용자 프로필 정보 로드
}, [user?.id])

useEffect(() => {
  // 프로필 데이터 변경 감지
}, [user])
```

---

### `app/profile/edit/page.tsx`
```typescript
useEffect(() => {
  // 프로필 수정 폼 초기화
}, [user?.id])

useEffect(() => {
  // 프로필 데이터 로드
}, [])
```

---

### `app/profile/addresses/page.tsx`
```typescript
useEffect(() => {
  // 배송지 목록 로드
}, [user?.id])

useEffect(() => {
  // 배송지 변경 감지
}, [])
```

---

### `app/profile/coupons/page.tsx`
```typescript
useEffect(() => {
  // 쿠폰 목록 로드
}, [user?.id])

useEffect(() => {
  // 쿠폰 상태 필터 변경
}, [statusFilter])
```

---

### `app/wishlist/page.tsx`
```typescript
useEffect(() => {
  // 찜 목록 로드
}, [user?.id])
```

---

### `app/auth/naver/callback/page.tsx`
```typescript
useEffect(() => {
  // 네이버 로그인 콜백 처리
}, [])
```

---

### Admin 페이지들

#### `app/admin/page.tsx`
```typescript
useEffect(() => {
  // 관리자 대시보드 데이터 로드
}, [])
```

#### `app/admin/orders/page.tsx`
```typescript
useEffect(() => {
  // 주문 목록 로드 (관리자)
}, [statusFilter, page])
```

#### `app/admin/coupons/page.tsx`
```typescript
useEffect(() => {
  // 쿠폰 목록 로드
}, [page])
```

#### `app/admin/flash-sales/page.tsx`
```typescript
useEffect(() => {
  // 플래시 세일 설정 로드
}, [])
```

#### `app/admin/discounts/page.tsx`
```typescript
useEffect(() => {
  // 할인 상품 목록 로드
}, [])
```

#### `app/admin/promotions/page.tsx`
```typescript
useEffect(() => {
  // 프로모션 목록 로드
}, [page])
```

---

### `app/products/[id]/reviews/page.tsx`
```typescript
useEffect(() => {
  // 리뷰 목록 로드
}, [productId, page])

useEffect(() => {
  // 페이지네이션 처리
}, [page])

useEffect(() => {
  // 이미지 갤러리 모달 관리
}, [showImageModal])

useEffect(() => {
  // 키보드 네비게이션
}, [isOpen])

useEffect(() => {
  // 리뷰 데이터 변경 감지
}, [reviewId])

useEffect(() => {
  // 무한 스크롤 또는 페이지네이션
}, [])
```

---

### `app/products/[id]/reviews/gallery/page.tsx`
```typescript
useEffect(() => {
  // 갤러리 이미지 로드
}, [productId])

useEffect(() => {
  // 키보드 네비게이션 (이미지 이동)
}, [isOpen])

useEffect(() => {
  // 이미지 인덱스 변경 감지
}, [currentImageIndex])
```

---

### `app/profile/reviews/page.tsx`
```typescript
useEffect(() => {
  // 내 리뷰 목록 로드
}, [user?.id])

useEffect(() => {
  // 리뷰 작성 가능한 주문 목록 로드
}, [user?.id])

useEffect(() => {
  // 리뷰 상태 필터 변경
}, [filter])
```

---

### `components/review/ReviewWriteModal.tsx`
```typescript
useEffect(() => {
  // 리뷰 작성 모달 초기화 및 데이터 로드
}, [isOpen, productId, orderId])
```

---

## 사용 패턴 요약

### 1. 데이터 로드 (가장 흔한 패턴)
```typescript
useEffect(() => {
  if (!user?.id) return
  loadData()
}, [user?.id])
```
**사용 예시**: 
- `useAddress.ts` - 배송지 로드
- `app/orders/page.tsx` - 주문 목록 로드
- `app/wishlist/page.tsx` - 찜 목록 로드

### 2. 이벤트 리스너 등록/해제
```typescript
useEffect(() => {
  window.addEventListener('event', handler)
  return () => window.removeEventListener('event', handler)
}, [dependencies])
```
**사용 예시**:
- `ScrollToTop.tsx` - 스크롤 이벤트
- `app/page.tsx` - 무한 스크롤
- `ReviewList.tsx` - 키보드 이벤트

### 3. 타이머/Interval 관리
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // 반복 작업
  }, 1000)
  return () => clearInterval(interval)
}, [dependencies])
```
**사용 예시**:
- `FlashSaleCountdown.tsx` - 카운트다운

### 4. 외부 스크립트 로드
```typescript
useEffect(() => {
  const script = document.createElement('script')
  script.src = 'url'
  document.body.appendChild(script)
  return () => {
    if (document.body.contains(script)) {
      document.body.removeChild(script)
    }
  }
}, [])
```
**사용 예시**:
- `useDaumPostcode.ts` - 다음 우편번호 API

### 5. 실시간 구독 (Supabase Realtime)
```typescript
useEffect(() => {
  const channel = supabase.channel('name').subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}, [dependencies])
```
**사용 예시**:
- `app/cart/page.tsx` - 상품 가격 변경 감지
- `lib/auth-context.tsx` - 인증 상태 변경 감지

### 6. 조건부 상태 초기화
```typescript
useEffect(() => {
  if (condition) {
    // 상태 초기화
  }
}, [condition])
```
**사용 예시**:
- `PromotionModal.tsx` - 모달 닫을 때 초기화
- `Header.tsx` - 검색 모드 닫을 때 초기화

### 7. Hydration 에러 방지
```typescript
useEffect(() => {
  setMounted(true)
}, [])
```
**사용 예시**:
- `app/cart/page.tsx` - 클라이언트 마운트 확인

### 8. 세션 스토리지/로컬 스토리지 읽기
```typescript
useEffect(() => {
  const data = sessionStorage.getItem('key')
  // 상태에 적용
}, [])
```
**사용 예시**:
- `app/checkout/page.tsx` - 배송 방법 불러오기

### 9. URL 파라미터 처리
```typescript
useEffect(() => {
  const param = searchParams?.get('key')
  if (param === 'value') {
    // 처리
  }
}, [searchParams])
```
**사용 예시**:
- `app/products/[id]/page.tsx` - 프로모션 모달 자동 열기

### 10. 무한 스크롤/페이지네이션
```typescript
useEffect(() => {
  const handleScroll = () => {
    if (isNearBottom()) {
      loadMore()
    }
  }
  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [loadMore])
```
**사용 예시**:
- `app/page.tsx` - 상품 목록 무한 스크롤

---

## 주요 특징

1. **Cleanup 함수 사용이 많음**: 이벤트 리스너, 구독, 타이머 등 메모리 누수 방지
2. **조건부 실행**: `user?.id` 체크로 로그인 상태 확인 후 실행
3. **의존성 배열 최적화**: 필요한 값만 의존성에 포함
4. **비동기 처리**: async/await 패턴으로 데이터 로드
5. **에러 처리**: try-catch로 안전한 데이터 로드

---

## 주의사항

1. **무한 루프 방지**: 의존성 배열에 함수를 넣을 때 `useCallback` 사용 권장
   - ❌ 잘못된 예: 함수를 직접 정의하면 렌더링마다 새 함수 생성 → 무한 루프
     ```typescript
     useEffect(() => {
       const fetchData = async () => { /* ... */ }
       fetchData()
     }, [fetchData]) // fetchData가 매번 새로 생성되어 무한 루프
     ```
   - ✅ 올바른 예: `useCallback`으로 함수 메모이제이션
     ```typescript
     const fetchProduct = useCallback(async () => {
       // ...
     }, [productId, router])
     
     useEffect(() => {
       fetchProduct()
     }, [fetchProduct]) // 메모이제이션된 함수이므로 안전
     ```
   
2. **Cleanup 필수**: 이벤트 리스너, 구독, 타이머는 반드시 cleanup 함수 제공
   - 메모리 누수 방지를 위해 `addEventListener`는 `removeEventListener`, `setInterval`은 `clearInterval` 필수
   - Supabase Realtime 채널도 `removeChannel`로 정리 필요
   
3. **조건부 실행**: `user?.id` 같은 조건으로 불필요한 실행 방지
   - 로그인하지 않은 사용자에 대한 API 호출 방지
   - `if (!user?.id) return` 패턴을 적극 활용
   
4. **Hydration 에러**: 클라이언트 전용 상태는 `useEffect` 내에서 설정
   - `window`, `document`, `localStorage` 등은 SSR에서 접근 불가
   - `mounted` 상태로 클라이언트 마운트 후에만 접근하도록 처리

---

## 통계

- **총 파일 수**: 37개 파일에서 `useEffect` 사용
- **총 사용 횟수**: 약 109번
- **Cleanup 함수 사용**: 약 40% 이상
- **의존성 배열 `[]` (마운트 시 한 번)**: 약 20%
- **의존성이 있는 경우**: 약 80%

---

*마지막 업데이트: 2024년*

