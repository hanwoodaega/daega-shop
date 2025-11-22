# 사용되지 않는 테이블 및 컬럼 분석

## 분석 결과

### ⚠️ 사용되지 않거나 거의 사용되지 않는 컬럼

#### 1. `coupons` 테이블 ✅ 정리 완료
- **`valid_from`** - 레거시 컬럼 (사용 안 함, `validity_days`로 대체됨)
- **`valid_until`** - 레거시 컬럼 (사용 안 함, `validity_days`로 대체됨)
- **실제 검증**: `validity_days` 사용 (발급일부터 일수로 계산)

**변경 사항**:
- ✅ `app/api/admin/coupons/issue/route.ts` - `valid_from`, `valid_until` 검증 제거
- ✅ `app/admin/coupons/page.tsx` - 쿠폰 생성/수정 시 `valid_from`, `valid_until` 설정 제거
- ✅ `lib/supabase.ts` - 타입 정의에서 optional로 변경 및 주석 업데이트

**권장사항**: 
- DB에서 `valid_from`, `valid_until` 컬럼 제거 고려 (향후 마이그레이션)
- 현재는 타입만 optional로 유지하여 호환성 보장

#### 2. `orders` 테이블 ✅ 정리 완료
- **`is_confirmed`** - 실제로는 `point_history`에서 확인 (컬럼 없음, 가상 속성)

**변경 사항**:
- ✅ `confirm_reminder_sent_at`, `review_request_sent_at` 컬럼 제거 (불필요)
  - 자동 알림 발송은 배송완료/구매확정 시 자동으로 한 번만 실행되므로 중복 방지 불필요
  - 관리자 수동 알림은 다른 API 사용
- ✅ 폴백 처리 제거, 명확한 에러 처리로 변경

### ✅ 모든 테이블이 사용 중

다음 테이블들은 모두 실제로 사용되고 있습니다:

1. **orders** - 주문 정보
2. **order_items** - 주문 상품
3. **products** - 상품 정보
4. **carts** - 장바구니
5. **wishlists** - 위시리스트
6. **reviews** - 리뷰
7. **user_points** - 사용자 포인트
8. **point_history** - 포인트 내역
9. **user_coupons** - 사용자 보유 쿠폰
10. **coupons** - 쿠폰 마스터
11. **addresses** - 배송지 주소
12. **notifications** - 알림
13. **flash_sale_settings** - 타임딜 설정 (관리자 페이지에서 사용)

### 🔍 확인이 필요한 컬럼

#### `orders` 테이블
- `is_confirmed` - 코드에서 사용하지만 실제 컬럼은 없고 `point_history`로 확인

#### `carts` 테이블
- `promotion_group_id` - 프로모션 그룹 ID (사용 중)
- `promotion_type` - 프로모션 타입 (사용 중)
- `discount_percent` - 할인율 (사용 중)

## 정리 제안

### 즉시 제거 가능
없음 (모든 컬럼이 사용 중이거나 향후 사용 계획이 있음)

### 확인 후 제거 고려
1. **`coupons.valid_from`**, **`coupons.valid_until`** ✅ 코드 정리 완료
   - 코드에서 사용 제거 완료
   - DB 컬럼은 향후 마이그레이션으로 제거 가능
   - 현재는 타입만 optional로 유지하여 호환성 보장

2. **`orders.confirm_reminder_sent_at`**, **`orders.review_request_sent_at`** ✅ 제거 완료
   - 자동 알림 발송은 중복 방지 불필요 (각 액션은 한 번만 실행)
   - 관리자 수동 알림은 다른 API 사용
   - 코드 및 타입 정의에서 제거 완료

### 유지 권장
- 모든 다른 컬럼들은 실제로 사용 중이거나 향후 확장을 위해 필요할 수 있음

## 체크리스트

- [x] `coupons.valid_from`, `coupons.valid_until` 코드에서 사용 제거 완료
- [x] `orders.confirm_reminder_sent_at`, `orders.review_request_sent_at` 제거 완료
- [ ] `coupons.valid_from`, `coupons.valid_until` DB 컬럼 제거 (향후 마이그레이션)
- [ ] `orders.confirm_reminder_sent_at`, `orders.review_request_sent_at` DB 컬럼 제거 (향후 마이그레이션)
- [ ] 제거 전 데이터 백업

