# 위시리스트 & 장바구니 DB 연동 가이드

## 📋 개요

위시리스트(찜)와 장바구니 기능이 Supabase DB와 연동되어, 로그인한 사용자는 모든 기기에서 데이터를 동기화할 수 있습니다.

## 🎯 주요 기능

### 1. **하이브리드 저장 방식**
- **비로그인**: localStorage에 저장 (빠른 응답)
- **로그인**: Supabase DB에 저장 (모든 기기 동기화)
- **로그인 시 자동 마이그레이션**: localStorage 데이터가 DB로 자동 이동

### 2. **Optimistic Update**
- UI는 즉시 반응하고, DB는 백그라운드에서 저장
- 네트워크 지연 없이 빠른 사용자 경험

### 3. **자동 동기화**
- 로그인 시 DB에서 자동으로 데이터 불러오기
- 로그아웃 시 localStorage로 전환

## 🚀 설치 방법

### 1단계: SQL 스크립트 실행

Supabase Dashboard에서 SQL Editor를 열고 다음 파일을 실행:

```bash
web/setup-wishlist-cart.sql
```

이 스크립트는 다음을 생성합니다:
- `wishlists` 테이블 (찜 목록)
- `carts` 테이블 (장바구니)
- Row Level Security (RLS) 정책
- 필요한 인덱스

### 2단계: 확인

SQL 실행 후 다음을 확인:

```sql
-- 테이블 확인
SELECT * FROM wishlists LIMIT 1;
SELECT * FROM carts LIMIT 1;

-- RLS 확인
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('wishlists', 'carts');
```

## 📁 구조

### API 라우트

#### `/api/wishlist`
- `GET`: 찜 목록 조회
- `POST`: 찜 추가
- `DELETE`: 찜 제거

#### `/api/cart`
- `GET`: 장바구니 조회
- `POST`: 장바구니에 상품 추가
- `PATCH`: 수량 수정
- `DELETE`: 상품 제거

### 동기화 유틸리티

#### `wishlist-sync.ts`
```typescript
import { toggleWishlist, syncWishlistFromDB, migrateWishlistToDB } from '@/lib/wishlist-sync'

// 찜 토글 (추가/제거)
await toggleWishlist(productId, isLoggedIn)

// DB에서 불러오기
await syncWishlistFromDB()

// localStorage → DB 마이그레이션
await migrateWishlistToDB()
```

#### `cart-sync.ts`
```typescript
import { addToCart, removeFromCart, updateCartQuantity, syncCartFromDB } from '@/lib/cart-sync'

// 장바구니에 추가
await addToCart(cartItem, isLoggedIn)

// 수량 수정
await updateCartQuantity(itemId, quantity, isLoggedIn)

// 제거
await removeFromCart(itemId, promotionGroupId, isLoggedIn)
```

### 자동 동기화

`auth-context.tsx`에서 자동으로 처리:
- 로그인 시: localStorage → DB 마이그레이션 + DB에서 불러오기
- 로그아웃 시: localStorage 모드로 전환

## 🔄 데이터 흐름

### 비로그인 사용자
```
사용자 액션 → localStorage 저장 → UI 업데이트
```

### 로그인 사용자
```
사용자 액션 → localStorage 즉시 업데이트 (Optimistic)
            → API 호출 (백그라운드)
            → 성공: 완료
            → 실패: 롤백
```

### 로그인 순간
```
로그인 → localStorage 데이터 읽기
      → DB에 마이그레이션
      → DB에서 전체 데이터 불러오기
      → localStorage 업데이트
```

## 📊 성능 최적화

### 1. Optimistic Update
- UI는 즉시 업데이트되어 사용자에게 빠른 피드백
- 네트워크 요청은 백그라운드에서 처리

### 2. 캐싱
- 한 번 불러온 데이터는 메모리에 캐싱
- 불필요한 API 호출 최소화

### 3. 에러 처리
- API 실패 시 자동 롤백
- 사용자에게 에러 메시지 표시

## 🧪 테스트

### 1. 위시리스트 테스트

```typescript
// 비로그인 상태
- 상품 찜하기 → localStorage 확인
- 페이지 새로고침 → 데이터 유지 확인

// 로그인
- 로그인 → DB에 데이터 마이그레이션 확인
- 다른 브라우저에서 로그인 → 동기화 확인

// 로그아웃
- 로그아웃 → localStorage 모드 확인
```

### 2. 장바구니 테스트

```typescript
// 비로그인
- 상품 추가 → localStorage 확인
- 수량 변경 → 즉시 반영 확인

// 로그인
- 로그인 → DB 마이그레이션 확인
- 다른 기기에서 확인 → 동기화 확인
```

## 🛠️ 문제 해결

### 1. "로그인이 필요합니다" 에러
- Supabase 인증 토큰 확인
- `auth.users` 테이블 권한 확인

### 2. RLS 에러
```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename IN ('wishlists', 'carts');

-- 정책 재생성
DROP POLICY IF EXISTS "Users can view their own wishlists" ON wishlists;
-- (setup-wishlist-cart.sql 다시 실행)
```

### 3. 동기화 안됨
- 브라우저 콘솔에서 에러 확인
- 네트워크 탭에서 API 응답 확인
- localStorage 데이터 확인: `localStorage.getItem('wishlist-storage')`

## 📈 향후 개선 사항

- [ ] 실시간 동기화 (Supabase Realtime)
- [ ] 오프라인 지원 (Service Worker)
- [ ] 찜한 상품 알림 (가격 변동, 재입고)
- [ ] 장바구니 공유 기능

## 🔐 보안

- Row Level Security (RLS) 활성화
- 사용자는 자신의 데이터만 조회/수정 가능
- API 라우트에서 인증 확인
- SQL Injection 방지 (Supabase 자동 처리)

## 💡 팁

1. **개발 환경에서 테스트**
   - localStorage 초기화: `localStorage.clear()`
   - DB 초기화: SQL Editor에서 `DELETE FROM wishlists; DELETE FROM carts;`

2. **프로덕션 배포 전**
   - SQL 스크립트 실행 확인
   - RLS 정책 테스트
   - 다양한 브라우저에서 테스트

3. **모니터링**
   - Supabase Dashboard에서 API 사용량 확인
   - 에러 로그 모니터링

