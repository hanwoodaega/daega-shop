# 데이터베이스 스키마 문서

이 문서는 프로젝트에서 사용하는 모든 데이터베이스 테이블과 컬럼을 정리한 문서입니다.

## 목차

1. [핵심 테이블](#핵심-테이블)
2. [사용자 관련 테이블](#사용자-관련-테이블)
3. [주문 관련 테이블](#주문-관련-테이블)
4. [상품 관련 테이블](#상품-관련-테이블)
5. [프로모션 관련 테이블](#프로모션-관련-테이블)
6. [선물 관련 테이블](#선물-관련-테이블)
7. [컬렉션 관련 테이블](#컬렉션-관련-테이블)
8. [마케팅 관련 테이블](#마케팅-관련-테이블)
9. [시스템 테이블](#시스템-테이블)

---

## 핵심 테이블

### products (상품)

상품의 기본 정보만 저장하는 테이블입니다. 할인/프로모션/선물 정보는 별도 테이블로 분리됩니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| slug | TEXT | NULL | URL 슬러그 |
| brand | TEXT | NULL | 브랜드명 |
| name | TEXT | NOT NULL | 상품명 |
| price | NUMERIC | NOT NULL | 가격 |
| image_url | TEXT | NOT NULL | 이미지 URL |
| category | TEXT | NOT NULL | 카테고리 |
| average_rating | NUMERIC | NULL | 평균 별점 |
| review_count | INTEGER | NULL | 리뷰 개수 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- category
- slug (UNIQUE)

**참고:** 할인, 프로모션, 선물 관련 정보는 다음 테이블들을 참조하세요:
- `promotions`, `promotion_products` - 프로모션 정보
- `gift_categories`, `gift_category_products` - 선물 카테고리 정보
- `flash_sale` - 타임딜 정보

---

## 사용자 관련 테이블

### users (사용자)

사용자 정보를 저장하는 테이블입니다. (Supabase Auth의 users 테이블 확장)

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 (auth.users.id와 동일) |
| name | TEXT | NULL | 이름 |
| email | TEXT | NULL | 이메일 |
| phone | TEXT | NULL | 전화번호 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

### addresses (배송지)

사용자의 배송지 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) |
| name | TEXT | NOT NULL | 배송지명 |
| recipient_name | TEXT | NOT NULL | 수령인 이름 |
| recipient_phone | TEXT | NOT NULL | 수령인 전화번호 |
| zipcode | TEXT | NULL | 우편번호 |
| address | TEXT | NOT NULL | 주소 |
| address_detail | TEXT | NULL | 상세주소 |
| delivery_note | TEXT | NULL | 배송 요청사항 |
| is_default | BOOLEAN | NOT NULL | 기본 배송지 여부 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- user_id
- is_default (부분 인덱스: is_default = true)

### payment_cards (결제 카드)

사용자의 결제 카드 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) |
| card_number | TEXT | NOT NULL | 카드번호 (마스킹 처리) |
| card_company | TEXT | NOT NULL | 카드사 |
| expiry_date | TEXT | NOT NULL | 만료일 |
| is_default | BOOLEAN | NOT NULL | 기본 카드 여부 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- user_id

---

## 주문 관련 테이블

### orders (주문)

주문 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| order_number | TEXT | NULL | 고객용 주문번호 (YYYYMMDD-####) |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) |
| total_amount | NUMERIC | NOT NULL | 총 결제금액 |
| status | TEXT | NOT NULL | 주문 상태 ('pending', 'ORDER_RECEIVED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'cancelled') |
| delivery_type | TEXT | NOT NULL | 배송 유형 ('pickup', 'quick', 'regular') |
| delivery_time | TEXT | NULL | 배송/픽업 시간 |
| shipping_address | TEXT | NOT NULL | 배송지 주소 |
| shipping_name | TEXT | NOT NULL | 수령인 이름 |
| shipping_phone | TEXT | NOT NULL | 수령인 전화번호 |
| delivery_note | TEXT | NULL | 배송 요청사항 |
| tracking_number | TEXT | NULL | 송장번호 |
| tracking_company | TEXT | NULL | 택배사 |
| refund_status | TEXT | NULL | 환불 상태 ('pending', 'processing', 'completed') |
| refund_amount | NUMERIC | NULL | 환불 금액 |
| refund_requested_at | TIMESTAMP | NULL | 환불 요청일시 |
| refund_completed_at | TIMESTAMP | NULL | 환불 완료일시 |
| gift_token | TEXT | NULL | 선물 토큰 (선물 주문인 경우) |
| gift_card_design | TEXT | NULL | 선물 카드 디자인 |
| gift_message | TEXT | NULL | 선물 메시지 |
| is_confirmed | BOOLEAN | NULL | 구매확정 여부 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- user_id
- status
- created_at (DESC)
- gift_token (부분 인덱스: gift_token IS NOT NULL)
- tracking_number (부분 인덱스: tracking_number IS NOT NULL)
- refund_status (부분 인덱스: refund_status IS NOT NULL)
- 복합 인덱스: (user_id, status)
- 복합 인덱스: (status, created_at DESC)

### order_items (주문 상품)

주문에 포함된 상품 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| order_id | UUID | NOT NULL | 주문 ID (orders.id 참조) |
| product_id | UUID | NOT NULL | 상품 ID (products.id 참조) |
| quantity | INTEGER | NOT NULL | 수량 |
| price | NUMERIC | NOT NULL | 단가 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

**인덱스:**
- order_id
- product_id

---

## 상품 관련 테이블

### carts (장바구니)

사용자의 장바구니 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) |
| product_id | UUID | NOT NULL | 상품 ID (products.id 참조) |
| quantity | INTEGER | NOT NULL | 수량 |
| promotion_type | TEXT | NULL | 프로모션 타입 ('1+1', '2+1', '3+1') |
| promotion_group_id | TEXT | NULL | 프로모션 그룹 ID (같은 그룹끼리 묶음) |
| discount_percent | NUMERIC | NULL | 할인율 (%) |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- user_id
- product_id
- promotion_group_id (부분 인덱스: promotion_group_id IS NOT NULL)

### wishlists (찜 목록)

사용자의 찜 목록을 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) |
| product_id | UUID | NOT NULL | 상품 ID (products.id 참조) |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

**인덱스:**
- user_id
- product_id
- 복합 인덱스: (user_id, product_id) - UNIQUE

### reviews (리뷰)

상품 리뷰를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) |
| product_id | UUID | NOT NULL | 상품 ID (products.id 참조) |
| order_id | UUID | NULL | 주문 ID (orders.id 참조) |
| rating | INTEGER | NOT NULL | 별점 (1-5) |
| title | TEXT | NULL | 리뷰 제목 |
| content | TEXT | NOT NULL | 리뷰 내용 |
| images | TEXT[] | NULL | 리뷰 이미지 URL 배열 |
| is_verified_purchase | BOOLEAN | NOT NULL | 구매확정 상품 여부 |
| status | TEXT | NOT NULL | 리뷰 상태 |
| is_approved | BOOLEAN | NOT NULL | 승인 여부 (관리자 승인 필요) |
| admin_reply | TEXT | NULL | 관리자 답변 |
| admin_replied_at | TIMESTAMP | NULL | 관리자 답변일시 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- user_id
- product_id
- order_id (부분 인덱스: order_id IS NOT NULL)
- is_approved (부분 인덱스: is_approved = true)
- 복합 인덱스: (product_id, is_approved)

---

## 프로모션 관련 테이블

### promotions (프로모션 마스터)

프로모션 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| title | TEXT | NOT NULL | 프로모션 제목 |
| type | TEXT | NOT NULL | 프로모션 타입 ('bogo', 'percent') |
| buy_qty | INTEGER | NULL | BOGO 전용 - 구매해야 할 개수 (1, 2, 3) |
| discount_percent | NUMERIC | NULL | Percent 전용 - 할인율 (%) |
| start_at | TIMESTAMP | NULL | 시작 시간 |
| end_at | TIMESTAMP | NULL | 종료 시간 |
| is_active | BOOLEAN | NOT NULL | 활성화 여부 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**제약조건:**
- `type = 'bogo'`인 경우: `buy_qty` 필수, `discount_percent` NULL
- `type = 'percent'`인 경우: `discount_percent` 필수, `buy_qty` NULL

**프로모션 타입 예시:**
- 1+1: `type = 'bogo'`, `buy_qty = 1`
- 2+1: `type = 'bogo'`, `buy_qty = 2`
- 3+1: `type = 'bogo'`, `buy_qty = 3`
- 20% 할인: `type = 'percent'`, `discount_percent = 20`

**인덱스:**
- type
- is_active (부분 인덱스: is_active = true)
- 복합 인덱스: (start_at, end_at)

### promotion_products (프로모션-상품 매핑)

프로모션과 상품의 매핑을 저장하는 테이블입니다. BOGO 프로모션의 경우 같은 `group_id`를 가진 상품끼리 묶음 계산됩니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| promotion_id | UUID | NOT NULL | 프로모션 ID (promotions.id 참조) |
| product_id | UUID | NOT NULL | 상품 ID (products.id 참조) |
| group_id | TEXT | NULL | 묶음 구성용 (같은 그룹끼리 1+1/2+1/3+1 계산) |
| priority | INTEGER | NULL | 프로모션 내 표시 우선순위 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

**장바구니 계산 로직:**
1. 같은 `group_id`의 상품만 모음
2. 개수가 `buy_qty + 1` 이상이면 가격 오름차순 정렬
3. 가장 싼 상품 → 무료 처리
4. `(buy_qty + 1)`만큼 개수 줄이고 반복
5. Percent 할인은 단순히 1:1 적용

**인덱스:**
- promotion_id
- product_id
- group_id
- priority (DESC)
- 복합 인덱스: (promotion_id, product_id) - UNIQUE

---

## 선물 관련 테이블

### gift_categories (선물 카테고리)

선물관 카테고리 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| name | TEXT | NOT NULL | 카테고리명 (예: '실시간 인기', '예산별 추천', '부모님 선물') |
| slug | TEXT | NOT NULL | URL 슬러그 (UNIQUE) |
| priority | INTEGER | NULL | 표시 우선순위 (낮을수록 먼저 표시) |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

**인덱스:**
- slug (UNIQUE)
- priority (DESC)

### gift_category_products (선물 카테고리-상품 매핑)

선물 카테고리와 상품의 매핑을 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| gift_category_id | UUID | NOT NULL | 선물 카테고리 ID (gift_categories.id 참조) |
| product_id | UUID | NOT NULL | 상품 ID (products.id 참조) |
| priority | INTEGER | NULL | 카테고리 내 표시 우선순위 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

**인덱스:**
- gift_category_id
- product_id
- priority (DESC)
- 복합 인덱스: (gift_category_id, product_id) - UNIQUE

---

## 컬렉션 관련 테이블

### collections (컬렉션)

베스트, 특가, 한우대가 NO.9, 타임딜 등 상품 그룹을 관리하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| type | TEXT | NOT NULL | 컬렉션 타입 ('timedeal', 'best', 'sale', 'no9') - UNIQUE |
| title | TEXT | NULL | 컬렉션 제목 (타임딜용: '오늘만 특가!' 등) |
| start_at | TIMESTAMP | NULL | 시작 시간 (타임딜용) |
| end_at | TIMESTAMP | NULL | 종료 시간 (타임딜용) |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- type (UNIQUE)
- type (일반 인덱스)

**제약조건:**
- type CHECK: type IN ('timedeal', 'best', 'sale', 'no9')

**특징:**
- 각 타입당 단 1개만 존재 (type UNIQUE)
- 타임딜 제목, 시작/종료 시간은 `collections` 테이블에서 관리
- 타임딜은 전시만 하며, 별도 할인 가격 설정 없음 (기존 프로모션 정보만 사용)

### collection_products (컬렉션-상품 매핑)

컬렉션에 속한 상품을 관리하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| collection_id | UUID | NOT NULL | 컬렉션 ID (collections.id 참조) |
| product_id | UUID | NOT NULL | 상품 ID (products.id 참조) |
| priority | INTEGER | NOT NULL | 정렬 순서 (낮을수록 먼저 표시) |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

**인덱스:**
- collection_id
- product_id
- priority (DESC)
- UNIQUE (collection_id, product_id)

**특징:**
- 타임딜 컬렉션의 경우 `priority`가 슬라이드 정렬 순서를 결정
- "전체보기" 페이지에서도 동일한 순서로 표시

### collections (컬렉션)

베스트, 특가, 한우대가 NO.9, 타임딜 등 상품 그룹을 관리하는 테이블입니다. 메인 메뉴에서 사용됩니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| name | TEXT | NOT NULL | 컬렉션명 (예: '베스트', '특가', '한우대가 No.9', '타임딜') |
| slug | TEXT | NOT NULL | URL 슬러그 (UNIQUE) |
| priority | INTEGER | NULL | 헤더 메뉴 순서 (낮을수록 먼저 표시) |
| is_active | BOOLEAN | NOT NULL | 전시 여부 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- slug (UNIQUE)
- is_active (부분 인덱스: is_active = true)
- priority (DESC)
- end_at (부분 인덱스: slug = 'timedeal' AND is_active = true)

**특징:**
- 타임딜 컬렉션은 단 1개만 존재 (slug = 'timedeal')
- 타임딜 제목, 시작/종료 시간은 `collections` 테이블에서 관리
- 타임딜 종료 시 `is_active = false`로 자동 변경 (collections.end_at 기준)
- 타임딜 상품의 가격은 `flash_sale` 테이블에서 관리

**사용 예시:**
- `/collections/best` - 베스트 상품 목록
- `/collections/sale` - 특가 상품 목록
- `/collections/no9` - 한우대가 NO.9 상품 목록
- `/collections/timedeal` - 타임딜 상품 목록

### collection_products (컬렉션-상품 매핑)

컬렉션과 상품의 매핑을 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| collection_id | UUID | NOT NULL | 컬렉션 ID (collections.id 참조) |
| product_id | UUID | NOT NULL | 상품 ID (products.id 참조) |
| priority | INTEGER | NULL | 컬렉션 내 정렬 순서 (낮을수록 먼저 표시) |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

**인덱스:**
- collection_id
- product_id
- priority (DESC)
- 복합 인덱스: (collection_id, product_id) - UNIQUE

**특징:**
- 타임딜 컬렉션의 경우 `priority`가 슬라이드 정렬 순서를 결정
- "전체보기" 페이지에서도 동일한 순서로 표시

---

## 마케팅 관련 테이블

### coupons (쿠폰 마스터)

쿠폰 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| name | TEXT | NOT NULL | 쿠폰명 |
| description | TEXT | NULL | 쿠폰 설명 |
| discount_type | TEXT | NOT NULL | 할인 타입 ('percentage', 'fixed') |
| discount_value | NUMERIC | NOT NULL | 할인율(%) 또는 할인 금액(원) |
| min_purchase_amount | NUMERIC | NULL | 최소 구매 금액 |
| max_discount_amount | NUMERIC | NULL | 최대 할인 금액 (percentage일 때만) |
| validity_days | INTEGER | NOT NULL | 유효 기간 (일수) |
| valid_from | TIMESTAMP | NULL | 레거시 컬럼 (사용 안 함) |
| valid_until | TIMESTAMP | NULL | 레거시 컬럼 (사용 안 함) |
| is_active | BOOLEAN | NOT NULL | 활성화 여부 |
| usage_limit | INTEGER | NULL | 전체 사용 가능 횟수 (null이면 무제한) |
| usage_count | INTEGER | NOT NULL | 현재 사용 횟수 |
| is_first_purchase_only | BOOLEAN | NOT NULL | 첫구매 전용 여부 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- is_active (부분 인덱스: is_active = true)

### user_coupons (사용자 쿠폰)

사용자가 보유한 쿠폰을 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) |
| coupon_id | UUID | NOT NULL | 쿠폰 ID (coupons.id 참조) |
| is_used | BOOLEAN | NOT NULL | 사용 여부 |
| used_at | TIMESTAMP | NULL | 사용일시 |
| order_id | UUID | NULL | 사용한 주문 ID (orders.id 참조) |
| created_at | TIMESTAMP | NOT NULL | 발급일시 |

**인덱스:**
- user_id
- coupon_id
- is_used (부분 인덱스: is_used = false)
- order_id (부분 인덱스: order_id IS NOT NULL)
- 복합 인덱스: (user_id, is_used)

### user_points (사용자 포인트)

사용자의 포인트 총합을 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) - UNIQUE |
| total_points | NUMERIC | NOT NULL | 총 포인트 |
| purchase_count | INTEGER | NOT NULL | 구매 횟수 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

**인덱스:**
- user_id (UNIQUE)

### point_history (포인트 내역)

포인트 적립/사용 내역을 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) |
| points | NUMERIC | NOT NULL | 포인트 (양수: 적립, 음수: 사용) |
| type | TEXT | NOT NULL | 타입 ('purchase', 'review', 'referral', 'usage', 'expired') |
| description | TEXT | NOT NULL | 설명 |
| order_id | UUID | NULL | 주문 ID (orders.id 참조) |
| review_id | UUID | NULL | 리뷰 ID (reviews.id 참조) |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

**인덱스:**
- user_id
- type
- order_id (부분 인덱스: order_id IS NOT NULL)
- created_at (DESC)
- 복합 인덱스: (user_id, type)
- 복합 인덱스: (user_id, created_at DESC)

---

## 시스템 테이블

### notifications (알림)

사용자 알림을 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | UUID | NOT NULL | 기본키 |
| user_id | UUID | NOT NULL | 사용자 ID (users.id 참조) |
| title | TEXT | NOT NULL | 알림 제목 |
| message | TEXT | NOT NULL | 알림 내용 |
| type | TEXT | NOT NULL | 알림 타입 |
| is_read | BOOLEAN | NOT NULL | 읽음 여부 |
| link | TEXT | NULL | 링크 URL |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

**인덱스:**
- user_id
- is_read (부분 인덱스: is_read = false)
- created_at (DESC)
- 복합 인덱스: (user_id, is_read)

### flash_sale (타임딜 가격) - 제거됨

**이 테이블은 더 이상 사용하지 않습니다.**

타임딜은 이제 전시만 하며, 별도 할인 가격을 설정하지 않습니다. 이미 할인되거나 2+1 프로모션이 있는 상품들을 타임딜 컬렉션에 추가하여 전시합니다.

- 타임딜 상품은 `collections` 테이블의 'timedeal' 컬렉션과 `collection_products` 테이블을 통해 관리됩니다
- 각 상품의 기존 가격과 프로모션 정보는 `products`, `promotions` 테이블에서 관리됩니다
- 타임딜 제목, 시작/종료 시간은 `collections` 테이블에서 관리됩니다 (slug='timedeal')

---

## 테이블 관계도

```
users
  ├── addresses (1:N)
  ├── payment_cards (1:N)
  ├── orders (1:N)
  ├── carts (1:N)
  ├── wishlists (1:N)
  ├── reviews (1:N)
  ├── user_coupons (1:N)
  ├── user_points (1:1)
  ├── point_history (1:N)
  └── notifications (1:N)

orders
  ├── order_items (1:N)
  ├── user_coupons (1:N) [used_at]
  └── point_history (1:N) [order_id]

products
  ├── order_items (1:N)
  ├── carts (1:N)
  ├── wishlists (1:N)
  ├── reviews (1:N)
  ├── promotion_products (1:N)
  ├── gift_category_products (1:N)
  ├── collection_products (1:N)
  └── flash_sale (1:1)

collections
  └── collection_products (1:N)

promotions
  └── promotion_products (1:N)

gift_categories
  └── gift_category_products (1:N)

coupons
  └── user_coupons (1:N)

reviews
  └── point_history (1:N) [review_id]
```

---

## 주의사항

1. **RLS (Row Level Security)**: 모든 테이블에 RLS 정책이 적용되어 있어 사용자는 자신의 데이터만 조회/수정할 수 있습니다.

2. **인덱스**: 성능 최적화를 위해 자주 조회되는 컬럼에 인덱스가 설정되어 있습니다.

3. **타임스탬프**: 모든 테이블에 `created_at`과 `updated_at`이 있으며, 자동으로 관리됩니다.

4. **NULL 허용**: 선택적 필드는 NULL을 허용하며, 필수 필드는 NOT NULL 제약조건이 있습니다.

5. **배열 타입**: PostgreSQL의 배열 타입(TEXT[], NUMERIC[])을 사용하는 컬럼들이 있습니다.

---

## 마이그레이션 히스토리

- 초기 스키마 생성
- 타임딜 기능 추가 (collections 테이블로 통합, flash_sale 테이블은 가격만 저장)
- 선물 기능 추가 (orders.gift_*)
- 리뷰 기능 추가 (reviews)
- 포인트 시스템 추가 (user_points, point_history)
- 쿠폰 시스템 추가 (coupons, user_coupons)
- **스키마 재구성** (products 단순화, 프로모션/선물 분리)

---

## 업데이트 이력

- 2024-XX-XX: 초기 문서 작성
- 2024-XX-XX: 타임딜 관련 컬럼 추가
- 2024-XX-XX: 선물 기능 관련 컬럼 추가
- 2024-XX-XX: 스키마 재구성 - products 테이블 단순화 및 프로모션/선물 분리

---

## 스키마 재구성 안내

### 변경 사항

1. **products 테이블 단순화**
   - 할인/프로모션/선물 관련 컬럼 제거
   - 기본 상품 정보만 유지 (id, slug, brand, name, price, image_url, category, average_rating, review_count)

2. **새로운 테이블 추가**
   - `gift_categories`: 선물 카테고리 마스터
   - `gift_category_products`: 선물 카테고리-상품 매핑
   - `promotions`: 프로모션 마스터
   - `promotion_products`: 프로모션-상품 매핑
   - `flash_sale`: 타임딜 상품 가격 정보 (각 상품별 타임딜 가격 저장)
   - `collections`: 타임딜 제목, 시작/종료 시간 관리 (slug='timedeal')

3. **장점**
   - 상품 테이블이 단순해져 유지보수 용이
   - 프로모션과 선물 카테고리를 유연하게 조합 가능
   - UI 변경 시 DB 구조 변경 불필요
   - 확장성 향상

### 마이그레이션

마이그레이션 스크립트: `migrations/restructure_products_schema.sql`

주의: 마이그레이션 실행 전 백업 필수!

