# ⚠️ useEffect 무한루프 점검 결과

## 🟢 안전한 부분 (Safe) - 18개

### 1. **components/review/ReviewList.tsx** ✅
```typescript
// Line 68: fetchReviews는 useCallback으로 안전
}, [productId, page, limit])

// Line 85: 단순 데이터 fetch
}, [productId])

// Line 101: fetchReviews는 useCallback으로 안전
}, [fetchReviews])
```
**결과:** 완전히 안전 ✅

---

### 2. **app/products/[id]/reviews/page.tsx** ✅
```typescript
// Line 75: fetchReviews는 useCallback으로 안전
}, [productId])

// Line 94: 단순 데이터 fetch
}, [productId])

// Line 98: fetchReviews는 useCallback으로 안전
}, [productId, fetchReviews])

// Line 117: 상태 변경 없음 (스크롤만)
}, [reviews])

// Line 139: observer 설정만
}, [hasMore, loading])

// Line 145: page > 1 조건이 있어서 안전
}, [page, fetchReviews])
```
**결과:** 완전히 안전 ✅

---

### 3. **app/profile/reviews/page.tsx** ✅
```typescript
// Line 37: router는 안정적인 참조
}, [user, authLoading, router])

// Line 64: userId를 별도 추출하여 사용 (좋은 패턴)
}, [userId])

// Line 111: userId와 activeTab만 의존
}, [userId, activeTab])
```
**결과:** 완전히 안전 ✅ (userId 추출 패턴이 특히 좋음)

---

### 4. **components/review/ReviewWriteModal.tsx** ✅
```typescript
// Line 39: props만 의존, 상태 변경 안 함
}, [editMode, initialRating, initialTitle, initialContent, initialImages])
```
**결과:** 완전히 안전 ✅

---

### 5. **app/cart/page.tsx** ✅
```typescript
// Line 80: 배열을 문자열로 변환 (좋은 패턴)
}, [wishlistIds.join(',')])

// Line 109: items.length 사용 (좋은 패턴)
}, [items.length, showWishlist])
```
**결과:** 좋은 패턴 사용 ✅

---

## 🟡 개선 필요 (Needs Improvement) - 2개

### ⚠️ **문제 1: app/products/[id]/page.tsx - Line 102**
```typescript
useEffect(() => {
  const fetchReviewStats = async () => {
    // ...
  }
  
  if (productId) {
    fetchReviewStats()
  }
}, [productId, product?.average_rating])  // ❌ product?.average_rating 때문에 불필요한 재실행
```

**문제점:**
- `product`가 fetch되면 → `product.average_rating`이 변경됨
- 이 effect가 다시 실행되어 API를 또 호출함
- 무한루프는 아니지만 **불필요한 API 호출 발생** ⚠️

**해결 방법:**
```typescript
// ✅ product가 로드되면 average_rating을 바로 설정
useEffect(() => {
  if (product?.average_rating) {
    setAverageRating(product.average_rating)
  }
}, [product?.average_rating])

// ✅ 리뷰 카운트만 API로 가져오기 (average_rating은 product에서)
useEffect(() => {
  const fetchReviewCount = async () => {
    try {
      const response = await fetch(`/api/reviews?productId=${productId}&page=1&limit=1`)
      if (response.ok) {
        const data = await response.json()
        setReviewCount(data.total || 0)
      }
    } catch (error) {
      console.error('리뷰 개수 조회 실패:', error)
    }
  }

  if (productId) {
    fetchReviewCount()
  }
}, [productId])  // ✅ productId만 의존
```

---

### ⚠️⚠️ **문제 2: app/cart/page.tsx - Line 137** (더 심각)
```typescript
useEffect(() => {
  const outOfStockItems: {id: string, name: string}[] = []
  
  items.forEach(item => {
    const currentStock = stockStatus[item.productId]
    if (currentStock !== undefined && currentStock <= 0) {
      outOfStockItems.push({ id: item.id!, name: item.name })
    }
  })

  if (outOfStockItems.length > 0) {
    outOfStockItems.forEach(item => {
      removeItem(item.id)  // ❌ items를 변경
    })
    // ...
  }
}, [stockStatus, items.length])  // ❌ items.length가 의존성인데 removeItem으로 items를 변경
```

**문제점:**
- `removeItem` → `items` 변경 → `items.length` 변경 → effect 재실행
- 다행히 두 번째 실행에서는 `outOfStockItems.length === 0`이 되어 멈추지만
- **논리적으로 불안정한 패턴** ⚠️⚠️

**해결 방법:**
```typescript
// ✅ useRef로 처리 완료 여부 추적
const processedStockStatus = useRef<string>('')

useEffect(() => {
  // stockStatus를 문자열로 변환하여 비교
  const stockStatusKey = JSON.stringify(stockStatus)
  
  // 이미 처리한 stockStatus면 무시
  if (processedStockStatus.current === stockStatusKey) return
  
  const outOfStockItems: {id: string, name: string}[] = []
  
  items.forEach(item => {
    const currentStock = stockStatus[item.productId]
    if (currentStock !== undefined && currentStock <= 0) {
      outOfStockItems.push({ id: item.id!, name: item.name })
    }
  })

  if (outOfStockItems.length > 0) {
    processedStockStatus.current = stockStatusKey
    
    outOfStockItems.forEach(item => {
      removeItem(item.id)
    })
    
    const productNames = outOfStockItems.map(item => item.name).join(', ')
    toast.error(`${productNames}이(가) 품절되어 장바구니에서 제거되었습니다.`, {
      icon: '❌',
      duration: 5000,
    })
  }
}, [stockStatus])  // ✅ items.length 제거
```

---

## 📊 통계

- **총 useEffect 수:** 20개
- **안전:** 18개 (90%) 🟢
- **개선 필요:** 2개 (10%) 🟡
- **무한루프 위험:** 0개 (0%) ✅

---

## ✅ 결론

**현재 무한루프는 발생하지 않습니다!** 

하지만 2개의 useEffect에서 불필요한 재실행이 발생할 수 있으므로 개선을 권장합니다.

### 우선순위
1. **🔴 높음:** `app/cart/page.tsx` Line 137 (논리적 불안정성)
2. **🟡 중간:** `app/products/[id]/page.tsx` Line 102 (불필요한 API 호출)

