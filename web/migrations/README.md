# 데이터베이스 마이그레이션

## 마이그레이션 파일 목록

### 1. `add_tracking_fields_and_new_statuses.sql`
배송 상태 시스템 개선 및 송장번호, 환불 관련 컬럼 추가

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `tracking_number` 컬럼 추가
- `refund_status`, `refund_amount`, `refund_requested_at`, `refund_completed_at` 컬럼 추가
- 선물 관련 컬럼 추가 (`is_gift`, `gift_token`, `gift_message`, `gift_card_design`, `gift_expires_at`)
- 기존 주문 상태 마이그레이션:
  - `paid` → `ORDER_RECEIVED`
  - `shipped` → `IN_TRANSIT`
  - `delivered` → `DELIVERED`

### 2. `add_indexes.sql`
데이터베이스 성능 향상을 위한 인덱스 추가

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `orders`, `order_items`, `point_history`, `user_coupons`, `reviews`, `carts`, `wishlists`, `notifications`, `products` 테이블에 인덱스 추가

### 3. `remove_tracking_company.sql`
tracking_company 컬럼 제거 (롯데택배만 사용)

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `orders.tracking_company` 컬럼 제거

**제거 이유:**
- 롯데택배만 사용하므로 컬럼 불필요
- 코드에서 "롯데택배"로 하드코딩

**주의사항:**
- 이 마이그레이션은 데이터를 삭제하므로 실행 전 백업 필수
- 코드에서 이미 사용하지 않도록 정리되었으므로 안전하게 제거 가능

### 4. `remove_unused_notification_columns.sql`
불필요한 알림 추적 컬럼 제거

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `orders.confirm_reminder_sent_at` 컬럼 제거
- `orders.review_request_sent_at` 컬럼 제거

**제거 이유:**
- 배송완료 시 구매확정 알림은 자동으로 한 번만 발송되므로 중복 방지 불필요
- 구매확정 시 리뷰 요청 알림도 자동으로 한 번만 발송되므로 중복 방지 불필요
- 관리자 수동 알림은 다른 API를 사용하며 이 컬럼들을 사용하지 않음

**주의사항:**
- 이 마이그레이션은 데이터를 삭제하므로 실행 전 백업 필수
- 코드에서 이미 사용하지 않도록 정리되었으므로 안전하게 제거 가능

### 5. `remove_order_number_offsets.sql`
사용하지 않는 order_number_offsets 테이블 제거

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `order_number_offsets` 테이블 제거

**제거 이유:**
- 코드에서 사용되지 않음
- 주문번호 생성 로직이 구현되지 않음
- 불필요한 테이블

**주의사항:**
- 이 마이그레이션은 테이블을 삭제하므로 실행 전 백업 필수
- 코드에서 이미 사용하지 않도록 확인되었으므로 안전하게 제거 가능

### 6. `remove_stock_column.sql`
products 테이블에서 stock 컬럼 제거

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `products.stock` 컬럼 제거

**제거 이유:**
- 재고 관리를 하지 않으므로 불필요
- 관리자 페이지에서 재고 입력 제거
- 사용자 UI에서 재고 표시 제거
- 코드에서 stock 사용 제거

**주의사항:**
- 이 마이그레이션은 컬럼을 삭제하므로 실행 전 백업 필수
- 코드에서 이미 사용하지 않도록 정리되었으므로 안전하게 제거 가능

### 7. `remove_coupon_valid_dates.sql`
쿠폰 테이블에서 사용하지 않는 컬럼 제거

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `coupons.valid_from` 컬럼 제거 (레거시, `validity_days`로 대체됨)
- `coupons.valid_until` 컬럼 제거 (레거시, `validity_days`로 대체됨)

**주의사항:**
- 이 마이그레이션은 데이터를 삭제하므로 실행 전 백업 필수
- 코드에서 이미 사용하지 않도록 정리되었으므로 안전하게 제거 가능

### 8. `update_products_review_stats_trigger.sql`
상품 리뷰 통계 자동 업데이트 트리거 생성

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `update_product_review_stats()` 함수 생성
- 리뷰 INSERT/UPDATE/DELETE 시 자동으로 `products.average_rating`과 `products.review_count` 업데이트
- 승인된 리뷰(status = 'approved')만 통계에 포함
- 기존 리뷰 데이터로 초기 통계 계산

**트리거 동작:**
- 리뷰 작성 시: status가 'approved'이면 통계 업데이트
- 리뷰 수정 시: status가 'approved'로 변경되거나 rating이 변경되면 통계 업데이트
- 리뷰 삭제 시: 삭제된 리뷰가 'approved' 상태였으면 통계 업데이트

**성능 개선 효과:**
- 상품 목록 조회 시 매번 reviews 테이블을 조회할 필요 없음
- 인덱스를 활용한 빠른 정렬/필터링 가능
- 리뷰가 많아져도 성능 저하 없음

**주의사항:**
- 트리거는 자동으로 동작하므로 별도 코드 수정 불필요
- 기존 리뷰 데이터로 초기 통계가 계산되므로 실행 후 모든 상품의 통계가 업데이트됨

### 9. `remove_flash_sale_stock.sql`
products 테이블에서 flash_sale_stock 컬럼 제거

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `products.flash_sale_stock` 컬럼 제거

**제거 이유:**
- 재고 관리를 하지 않으므로 불필요
- 타임딜에서도 재고 입력 필드 제거
- 코드에서 flash_sale_stock 사용 제거

**주의사항:**
- 이 마이그레이션은 컬럼을 삭제하므로 실행 전 백업 필수
- 코드에서 이미 사용하지 않도록 정리되었으므로 안전하게 제거 가능

### 10. `update_flash_sale_structure.sql`
타임딜 구조 변경: products 테이블의 타임딜 시간을 flash_sale_settings로 이동

**실행 방법:**
1. Supabase Dashboard에서 SQL Editor 열기
2. 파일 내용을 복사하여 실행

**마이그레이션 내용:**
- `flash_sale_settings` 테이블에 `start_time`, `end_time` 컬럼 추가
- 기존 `products` 테이블의 타임딜 시간 데이터를 `flash_sale_settings`로 마이그레이션
- `products` 테이블에서 `flash_sale_start_time`, `flash_sale_end_time` 컬럼 제거

**변경 이유:**
- 모든 타임딜 상품이 같은 시간을 공유하도록 구조 변경
- 타임딜 시간 관리를 중앙화하여 관리 용이성 향상
- 코드에서 이미 변경 완료

**주의사항:**
- 이 마이그레이션은 컬럼을 추가/삭제하므로 실행 전 백업 필수
- 기존 타임딜 시간 데이터는 가장 최근 타임딜 시간으로 마이그레이션됨
- 코드에서 이미 사용하지 않도록 정리되었으므로 안전하게 실행 가능

## 공통 주의사항

- 마이그레이션 실행 전 데이터베이스 백업 권장
- 프로덕션 환경에서는 테스트 환경에서 먼저 검증 후 실행
- 마이그레이션은 순서대로 실행하는 것을 권장

