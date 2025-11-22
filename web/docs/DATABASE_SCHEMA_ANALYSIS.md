# 데이터베이스 스키마 분석 및 개선 제안

## 현재 사용 중인 테이블 목록

### 핵심 테이블
1. **orders** - 주문 정보
2. **order_items** - 주문 상품 (orders와 1:N 관계)
3. **products** - 상품 정보
4. **carts** - 장바구니
5. **wishlists** - 위시리스트
6. **reviews** - 리뷰

### 사용자 관련
7. **user_points** - 사용자 포인트 (총 포인트, 구매 횟수)
8. **point_history** - 포인트 내역 (적립/사용 기록)
9. **user_coupons** - 사용자 보유 쿠폰
10. **coupons** - 쿠폰 마스터
11. **addresses** - 배송지 주소

### 시스템
12. **notifications** - 알림
13. **flash_sale_settings** - 타임딜 설정

### Supabase Auth
14. **users** (auth.users) - 사용자 인증 정보

## 스키마 분석

### ✅ 잘 되어 있는 부분

1. **정규화**
   - 주문과 주문 상품이 분리되어 있음 (orders, order_items)
   - 쿠폰 마스터와 사용자 쿠폰이 분리되어 있음 (coupons, user_coupons)
   - 포인트 총합과 내역이 분리되어 있음 (user_points, point_history)

2. **관계 설계**
   - 외래키 관계가 명확함 (user_id, order_id, product_id 등)
   - 1:N 관계가 적절히 분리됨

3. **데이터 타입**
   - 금액은 NUMERIC 사용 (정확한 계산)
   - 날짜는 TIMESTAMP WITH TIME ZONE 사용 (시간대 고려)

### ⚠️ 개선이 필요한 부분

#### 1. 인덱스 부족 (성능 이슈)

**현재 문제:**
- 자주 조회되는 컬럼에 인덱스가 없을 가능성이 높음
- 특히 `orders` 테이블의 `status`, `user_id`, `created_at` 등

**필요한 인덱스:**
```sql
-- orders 테이블
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_gift_token ON orders(gift_token) WHERE gift_token IS NOT NULL;
CREATE INDEX idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX idx_orders_refund_status ON orders(refund_status) WHERE refund_status IS NOT NULL;

-- order_items 테이블
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- point_history 테이블
CREATE INDEX idx_point_history_user_id ON point_history(user_id);
CREATE INDEX idx_point_history_order_id ON point_history(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_point_history_type ON point_history(type);
CREATE INDEX idx_point_history_created_at ON point_history(created_at DESC);

-- user_coupons 테이블
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_order_id ON user_coupons(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_user_coupons_is_used ON user_coupons(is_used);

-- reviews 테이블
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_order_id ON reviews(order_id) WHERE order_id IS NOT NULL;

-- carts 테이블
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_product_id ON carts(product_id);

-- wishlists 테이블
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_product_id ON wishlists(product_id);

-- notifications 테이블
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- products 테이블
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_best ON products(is_best) WHERE is_best = true;
CREATE INDEX idx_products_is_sale ON products(is_sale) WHERE is_sale = true;
```

#### 2. orders 테이블 컬럼 누락 가능성

**선물 관련 필드:**
- `is_gift` (boolean)
- `gift_token` (text)
- `gift_message` (text)
- `gift_card_design` (text)
- `gift_expires_at` (timestamp)

코드에서 사용하지만 마이그레이션에 없을 수 있음.

#### 3. 복합 인덱스 필요

**자주 함께 조회되는 컬럼들:**
```sql
-- 주문 조회 시 자주 사용되는 조합
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- 포인트 내역 조회
CREATE INDEX idx_point_history_user_type ON point_history(user_id, type);
CREATE INDEX idx_point_history_user_created ON point_history(user_id, created_at DESC);
```

#### 4. NULL 값이 많은 컬럼 최적화

**부분 인덱스 사용:**
- `gift_token`, `tracking_number`, `refund_status` 등은 NULL이 많을 수 있음
- 부분 인덱스로 저장 공간 절약 및 성능 향상

#### 5. 데이터 타입 최적화

**현재:**
- `status`, `refund_status` 등이 TEXT로 저장됨

**개선:**
- ENUM 타입 사용 고려 (PostgreSQL의 경우)
- 또는 CHECK 제약조건으로 값 제한 (이미 일부 적용됨)

## 개선 제안

### 우선순위 1: 인덱스 추가 (즉시 필요)

성능에 직접적인 영향을 미치므로 가장 우선적으로 추가해야 함.

### 우선순위 2: 선물 관련 필드 확인

`orders` 테이블에 선물 관련 필드가 있는지 확인하고, 없으면 추가.

### 우선순위 3: 복합 인덱스 추가

자주 함께 조회되는 컬럼 조합에 복합 인덱스 추가.

### 우선순위 4: 통계 정보 업데이트

PostgreSQL의 경우 `ANALYZE` 실행으로 쿼리 플래너 최적화.

## 체크리스트

- [ ] 인덱스 추가 마이그레이션 작성
- [ ] 선물 관련 필드 확인 및 추가
- [ ] 복합 인덱스 추가
- [ ] 쿼리 성능 테스트
- [ ] EXPLAIN ANALYZE로 쿼리 플랜 확인


