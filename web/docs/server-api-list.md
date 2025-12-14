# 서버 API로 가져오는 정보 목록

## 📋 목차
1. [사용자 인증/프로필](#1-사용자-인증프로필)
2. [주문 관련](#2-주문-관련)
3. [장바구니](#3-장바구니)
4. [위시리스트](#4-위시리스트)
5. [포인트](#5-포인트)
6. [쿠폰](#6-쿠폰)
7. [주소](#7-주소)
8. [상품/컬렉션](#8-상품컬렉션)
9. [리뷰](#9-리뷰)
10. [배너/히어로](#10-배너히어로)
11. [선물](#11-선물)
12. [알림](#12-알림)
13. [추천](#13-추천)
14. [기타](#14-기타)

---

## 1. 사용자 인증/프로필

### `/api/auth/session` (GET)
- **용도**: 초기 세션 확인
- **반환 데이터**: `{ user: User | null }`
- **사용 위치**: `web/lib/auth-context.tsx`

### `/api/profile/info` (GET)
- **용도**: 마이페이지 통합 정보 조회
- **반환 데이터**: 
  ```typescript
  {
    name: string | null,           // 사용자 이름
    orders_count: number,          // 주문 개수
    coupons_count: number,         // 유효 쿠폰 개수
    points: number,                // 포인트
    errors: { ... }                // 에러 정보
  }
  ```
- **조회 테이블**: `users`, `orders`, `user_coupons`, `coupons`, `user_points`
- **사용 위치**: `web/app/profile/page.tsx`

### `/api/user/profile` (GET)
- **용도**: 사용자 프로필 정보 조회
- **반환 데이터**: `{ profile: { name, phone, email } | null }`
- **조회 테이블**: `users`
- **사용 위치**: `web/lib/hooks/useAddress.ts`

---

## 2. 주문 관련

### `/api/orders` (GET)
- **용도**: 사용자 주문 목록 조회
- **반환 데이터**: 
  ```typescript
  {
    orders: OrderWithItems[]      // 주문 목록 (구매확정 여부 포함)
  }
  ```
- **조회 테이블**: `orders`, `order_items`, `products`, `point_history`
- **사용 위치**: `web/app/orders/page.tsx`

### `/api/orders` (POST)
- **용도**: 주문 생성
- **요청 데이터**: 주문 정보, 배송 정보, 결제 정보
- **사용 위치**: `web/app/checkout/page.tsx`

### `/api/orders/cancel` (POST)
- **용도**: 주문 취소
- **사용 위치**: `web/app/orders/page.tsx`

### `/api/orders/confirm` (POST)
- **용도**: 구매확정 (포인트 적립)
- **사용 위치**: `web/app/orders/page.tsx`

---

## 3. 장바구니

### `/api/cart` (GET)
- **용도**: 장바구니 목록 조회
- **반환 데이터**: 
  ```typescript
  {
    success: boolean,
    items: CartItem[]             // 장바구니 항목 (상품 정보, 프로모션 정보 포함)
  }
  ```
- **조회 테이블**: `carts`, `products`, `promotion_products`, `promotions`, `product_images`
- **사용 위치**: `web/lib/cart-db.ts` → `loadCartFromDB()`

### `/api/cart` (POST)
- **용도**: 장바구니에 상품 추가
- **사용 위치**: `web/lib/cart-db.ts` → `addToCartDB()`

### `/api/cart` (PATCH)
- **용도**: 장바구니 수량 수정
- **사용 위치**: `web/lib/cart-db.ts` → `updateCartQuantityDB()`

### `/api/cart` (DELETE)
- **용도**: 장바구니에서 상품 제거
- **사용 위치**: `web/lib/cart-db.ts` → `removeFromCartDB()`

---

## 4. 위시리스트

### `/api/wishlist` (GET)
- **용도**: 위시리스트 조회
- **반환 데이터**: 
  ```typescript
  {
    success: boolean,
    items: string[],               // product_id 배열
    details: WishlistItem[]        // 상세 정보
  }
  ```
- **조회 테이블**: `wishlists`, `products`
- **사용 위치**: `web/lib/wishlist-db.ts` → `loadWishlistFromDB()`

### `/api/wishlist` (POST)
- **용도**: 위시리스트에 상품 추가
- **사용 위치**: `web/lib/wishlist-db.ts` → `addToWishlistDB()`

### `/api/wishlist` (DELETE)
- **용도**: 위시리스트에서 상품 제거
- **사용 위치**: `web/lib/wishlist-db.ts` → `removeFromWishlistDB()`

### `/api/wishlist/products` (POST)
- **용도**: 위시리스트 상품 상세 정보 조회
- **요청 데이터**: `{ productIds: string[] }`
- **사용 위치**: `web/app/wishlist/page.tsx`

---

## 5. 포인트

### `/api/points` (GET)
- **용도**: 사용자 포인트 조회
- **반환 데이터**: 
  ```typescript
  {
    userPoints: UserPoints | null  // 포인트 정보
  }
  ```
- **조회 테이블**: `user_points`
- **사용 위치**: `web/app/checkout/page.tsx`, `web/app/profile/points/page.tsx`

### `/api/points/history` (GET)
- **용도**: 포인트 히스토리 조회
- **반환 데이터**: 
  ```typescript
  {
    history: PointHistory[]       // 포인트 내역
  }
  ```
- **조회 테이블**: `point_history`
- **사용 위치**: `web/app/profile/points/page.tsx`

### `/api/points/pending` (GET)
- **용도**: 대기 중인 포인트 조회 (구매확정 대기)
- **사용 위치**: `web/app/profile/points/page.tsx`

---

## 6. 쿠폰

### `/api/coupons` (GET)
- **용도**: 사용자 보유 쿠폰 조회
- **쿼리 파라미터**: `includeUsed` (boolean)
- **반환 데이터**: 
  ```typescript
  {
    coupons: UserCoupon[]          // 쿠폰 목록 (유효기간 체크 포함)
  }
  ```
- **조회 테이블**: `user_coupons`, `coupons`
- **사용 위치**: `web/lib/coupons.ts` → `getUserCoupons()`

---

## 7. 주소

### `/api/addresses` (GET)
- **용도**: 주소 목록 조회
- **반환 데이터**: 
  ```typescript
  {
    addresses: Address[]            // 주소 목록
  }
  ```
- **조회 테이블**: `addresses`
- **사용 위치**: `web/lib/hooks/useAddress.ts` → `useAddresses()`

### `/api/addresses` (POST)
- **용도**: 주소 추가
- **사용 위치**: `web/app/checkout/page.tsx`

### `/api/addresses/default` (GET)
- **용도**: 기본 주소 조회
- **반환 데이터**: 
  ```typescript
  {
    address: Address | null,
    hasDefaultAddress: boolean
  }
  ```
- **조회 테이블**: `addresses`
- **사용 위치**: `web/lib/hooks/useAddress.ts` → `useDefaultAddress()`

### `/api/addresses/[id]` (PUT)
- **용도**: 주소 수정
- **사용 위치**: `web/app/checkout/page.tsx`

### `/api/addresses/[id]` (DELETE)
- **용도**: 주소 삭제
- **사용 위치**: `web/app/profile/addresses/page.tsx`

### `/api/addresses/[id]/default` (PUT)
- **용도**: 기본 배송지로 설정
- **사용 위치**: `web/app/cart/page.tsx`

### `/api/addresses/check` (POST)
- **용도**: 동일 주소 확인 및 주소 개수 조회
- **반환 데이터**: 
  ```typescript
  {
    existing: { id: string } | null,
    addressCount: number,
    error: string | null
  }
  ```
- **사용 위치**: `web/app/checkout/page.tsx`

---

## 8. 상품/컬렉션

### `/api/products` (GET)
- **용도**: 상품 목록 조회 (리뷰 통계 포함)
- **쿼리 파라미터**: `page`, `limit`, `sort`, `category`, `filter`, `search`
- **조회 테이블**: `products`, `product_images`, `reviews`, `promotions`, `promotion_products`, `timedeals`, `timedeal_products`
- **사용 위치**: `web/app/products/page.tsx`

### `/api/products/[id]` (GET)
- **용도**: 상품 상세 정보 조회
- **조회 테이블**: `products`, `product_images`, `reviews`, `promotions`
- **사용 위치**: `web/app/product/[id]/page.tsx`

### `/api/collections/main` (GET)
- **용도**: 메인페이지용 활성 컬렉션 목록
- **반환 데이터**: 
  ```typescript
  {
    collections: Collection[]      // 활성 컬렉션 목록
  }
  ```
- **조회 테이블**: `collections`
- **사용 위치**: `web/app/page.tsx`

### `/api/collections/[slug]` (GET)
- **용도**: 컬렉션 상세 및 상품 목록 조회
- **쿼리 파라미터**: `page`, `limit`, `sort`
- **조회 테이블**: `collections`, `collection_products`, `products`, `product_images`, `reviews`
- **사용 위치**: `web/app/collections/[slug]/page.tsx`

### `/api/timedeals` (GET)
- **용도**: 타임딜 상품 목록 조회 (공개 API)
- **쿼리 파라미터**: `limit`
- **조회 테이블**: `timedeals`, `timedeal_products`, `products`, `promotion_products`
- **사용 위치**: `web/app/products/page.tsx`, `web/app/sale/page.tsx`, `web/components/TimeDealSection.tsx`, `web/components/CollectionSection.tsx`

### `/api/admin/timedeals` (GET, POST, PUT, DELETE)
- **용도**: 타임딜 관리 (관리자 API)
- **GET**: 타임딜 목록 조회 (쿼리 파라미터: `active_only`)
- **POST**: 타임딜 생성
- **PUT**: 타임딜 수정
- **DELETE**: 타임딜 삭제 (쿼리 파라미터: `id`)
- **조회 테이블**: `timedeals`, `timedeal_products`, `products`
- **사용 위치**: `web/app/admin/timedeals/page.tsx`

---

## 9. 리뷰

### `/api/reviews/my-reviews` (GET)
- **용도**: 내가 작성한 리뷰 목록 조회
- **쿼리 파라미터**: `countOnly` (boolean)
- **반환 데이터**: 
  ```typescript
  {
    count?: number,                // countOnly=true일 때
    reviews?: Review[]             // countOnly=false일 때
  }
  ```
- **조회 테이블**: `reviews`, `products`
- **사용 위치**: `web/app/profile/reviews/page.tsx`

### `/api/reviews/reviewable` (GET)
- **용도**: 리뷰 작성 가능한 주문 조회
- **조회 테이블**: `orders`, `order_items`, `products`, `reviews`, `point_history`
- **사용 위치**: `web/app/profile/reviews/page.tsx`

### `/api/reviews` (POST)
- **용도**: 리뷰 작성
- **사용 위치**: `web/components/review/ReviewWriteModal.tsx`

### `/api/reviews/upload-image` (POST)
- **용도**: 리뷰 이미지 업로드
- **사용 위치**: `web/components/review/ReviewWriteModal.tsx`

---

## 10. 배너/히어로

### `/api/banners` (GET)
- **용도**: 활성 배너 목록 조회
- **조회 테이블**: `banners`, `banner_products`
- **사용 위치**: `web/components/BannerSection.tsx`

### `/api/banners/[slug]` (GET)
- **용도**: 배너 상세 및 상품 목록 조회
- **조회 테이블**: `banners`, `banner_products`, `products`
- **사용 위치**: `web/app/banner/[slug]/page.tsx`

### `/api/hero` (GET)
- **용도**: 히어로 슬라이더 정보 조회
- **조회 테이블**: `hero_slides`
- **사용 위치**: `web/components/HeroSlider.tsx`

---

## 11. 선물

### `/api/gift/featured` (GET)
- **용도**: 추천 선물 카테고리 조회
- **조회 테이블**: `gift_categories`
- **사용 위치**: `web/app/gift/page.tsx`

### `/api/gift/target/[slug]` (GET)
- **용도**: 대상별 선물 카테고리 상품 조회
- **조회 테이블**: `gift_categories`, `gift_category_products`, `products`
- **사용 위치**: `web/app/gift/page.tsx`

### `/api/gift/budget/[slug]` (GET)
- **용도**: 예산별 선물 카테고리 상품 조회
- **조회 테이블**: `gift_categories`, `gift_category_products`, `products`
- **사용 위치**: `web/app/gift/page.tsx`

### `/api/gift/[token]` (GET)
- **용도**: 선물 수령 정보 조회
- **조회 테이블**: `orders`, `order_items`, `products`
- **사용 위치**: `web/app/gift/receive/[token]/page.tsx`

### `/api/gift/upload-card-image` (POST)
- **용도**: 선물 카드 이미지 업로드
- **사용 위치**: `web/app/checkout/page.tsx`, `web/app/orders/page.tsx`

### `/api/gift/create-pending` (POST)
- **용도**: 선물 대기 주문 생성
- **사용 위치**: 내부 API

---

## 12. 알림

### `/api/notifications` (GET)
- **용도**: 알림 목록 조회
- **쿼리 파라미터**: `unread_only` (boolean)
- **반환 데이터**: 
  ```typescript
  {
    notifications: Notification[]  // 알림 목록
  }
  ```
- **조회 테이블**: `notifications`
- **사용 위치**: `web/app/notifications/page.tsx`

### `/api/notifications` (PATCH)
- **용도**: 알림 읽음 처리
- **사용 위치**: `web/app/notifications/page.tsx`

### `/api/notifications/unread-count` (GET)
- **용도**: 읽지 않은 알림 개수 조회
- **반환 데이터**: 
  ```typescript
  {
    count: number                  // 읽지 않은 알림 개수
  }
  ```
- **조회 테이블**: `notifications`
- **사용 위치**: `web/components/NotificationBell.tsx`

---

## 13. 추천

### `/api/recommendations` (GET)
- **용도**: 추천 상품 조회
- **조회 테이블**: `recommendations`, `recommendation_products`, `products`
- **사용 위치**: `web/components/RecommendationSection.tsx`

### `/api/recommendations/[categoryId]/products` (GET)
- **용도**: 카테고리별 추천 상품 조회
- **조회 테이블**: `recommendations`, `recommendation_products`, `products`
- **사용 위치**: 내부 API

---

## 14. 기타

### `/api/categories` (GET)
- **용도**: 카테고리 목록 조회
- **조회 테이블**: `categories`
- **사용 위치**: 내부 API

### `/api/users/terms` (GET)
- **용도**: 이용약관 조회
- **조회 테이블**: `users` (metadata)
- **사용 위치**: `web/app/auth/signup/page.tsx`, `web/app/auth/naver/callback/page.tsx`

### `/api/users/signup-coupon` (POST)
- **용도**: 회원가입 쿠폰 지급
- **사용 위치**: `web/app/auth/signup/page.tsx`

### `/api/auth/send-verification-code` (POST)
- **용도**: 인증 코드 발송
- **사용 위치**: `web/app/auth/signup/page.tsx`, `web/app/profile/edit/page.tsx`

### `/api/auth/verify-code` (POST)
- **용도**: 인증 코드 확인
- **사용 위치**: `web/app/auth/signup/page.tsx`

### `/api/auth/naver` (POST)
- **용도**: 네이버 로그인 처리
- **사용 위치**: `web/app/auth/naver/callback/page.tsx`

---

## 📊 통계

### 총 API 엔드포인트 수
- **공개 API**: 약 30개
- **관리자 API**: 약 40개
- **인증 필요 API**: 약 20개

### 주요 데이터 테이블
- `users`, `orders`, `order_items`
- `carts`, `wishlists`
- `user_points`, `point_history`
- `user_coupons`, `coupons`
- `addresses`
- `products`, `product_images`
- `collections`, `collection_products`
- `reviews`
- `banners`, `banner_products`
- `notifications`
- `gift_categories`, `gift_category_products`
- `recommendations`, `recommendation_products`
- `promotions`, `promotion_products`
- `timedeals`, `timedeal_products`

---

## 🔒 보안 상태

### ✅ 서버 API로 전환 완료 (민감한 데이터)
- ✅ 주문 조회/생성/취소/확정
- ✅ 주소 조회/추가/수정/삭제
- ✅ 포인트 조회/히스토리
- ✅ 장바구니 조회/추가/수정/삭제
- ✅ 위시리스트 조회/추가/삭제
- ✅ 쿠폰 조회
- ✅ 사용자 프로필 정보

### ⚠️ 클라이언트 직접 호출 (인증/공개 데이터)
- 인증 관련 (`auth-context.tsx`, 로그인/회원가입)
- Supabase Realtime 구독 (상품 가격 변경 감지)

---

**마지막 업데이트**: 2024년 (현재 작업 기준)


