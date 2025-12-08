# 쿠폰 시스템 보안 개선 사항

## 개선된 문제점

### 1. ✅ API 인증 강화
**문제**: 프론트엔드에서 직접 API를 호출하면 누구든지 브라우저 DevTools에서 쿠폰 발급/삭제/수정 요청을 보낼 수 있음

**해결**: 
- 모든 관리자 API 라우트에서 `assertAdmin()` 함수를 사용하여 서버 사이드 인증 확인
- 쿠키 기반 인증으로 관리자 권한 검증
- 인증 실패 시 401 Unauthorized 반환

**적용된 파일**:
- `app/api/admin/coupons/route.ts`
- `app/api/admin/coupons/[id]/route.ts`
- `app/api/admin/coupons/issue/route.ts`

### 2. ✅ 쿠폰 유효기간 서버 사이드 계산
**문제**: 프론트엔드에서 `validity_days`를 조작 가능

**해결**:
- `user_coupons` 테이블에 `expires_at` 필드 추가
- 쿠폰 발급 시 서버에서 `expires_at = NOW() + validity_days` 계산하여 저장
- 프론트엔드에서 `validity_days`를 보내더라도 서버에서 재계산하여 저장

**적용된 파일**:
- `migrations/user_coupons_add_expires_at.sql` - DB 마이그레이션
- `app/api/admin/coupons/issue/route.ts` - 관리자 쿠폰 발급
- `app/api/coupons/issue/route.ts` - 일반 쿠폰 발급
- `app/api/coupons/first-purchase/route.ts` - 첫구매 쿠폰 발급
- `migrations/batch_issue_coupons_rpc.sql` - RPC 함수 업데이트

### 3. ✅ 쿠폰 생성/수정 시 서버 사이드 검증 강화
**문제**: 프론트엔드에서 잘못된 값 전송 가능

**해결**:
- `validity_days`: 1일 이상 365일 이하로 제한
- `discount_value`: 양수만 허용
- `discount_type === 'percentage'`일 때 `max_discount_amount` 필수 검증

**적용된 파일**:
- `app/api/admin/coupons/route.ts` - 쿠폰 생성
- `app/api/admin/coupons/[id]/route.ts` - 쿠폰 수정

### 4. ✅ 중복 발급 방지 강화
**문제**: 같은 사용자에게 중복 발급 가능

**해결**:
- 쿠폰 발급 전에 이미 보유한 쿠폰인지 확인
- `user_coupons` 테이블의 `(user_id, coupon_id)` 조합으로 중복 체크
- RPC 함수 `batch_issue_coupons`에서 `ON CONFLICT DO NOTHING` 사용

**적용된 파일**:
- `app/api/coupons/issue/route.ts`
- `app/api/coupons/first-purchase/route.ts`
- `migrations/batch_issue_coupons_rpc.sql`

### 5. ✅ user_coupons 테이블 구조 개선
**문제**: 쿠폰 발급 히스토리 및 사용처 기록 부족

**해결**:
- `expires_at` 필드 추가 (서버에서 계산)
- `used_at`, `order_id` 필드로 사용 이력 기록 (이미 존재)
- 인덱스 추가로 성능 향상

**적용된 파일**:
- `migrations/user_coupons_add_expires_at.sql`
- `lib/supabase.ts` - 타입 정의 업데이트

## 데이터베이스 마이그레이션

### 1. user_coupons 테이블에 expires_at 필드 추가
```sql
-- migrations/user_coupons_add_expires_at.sql 실행 필요
ALTER TABLE user_coupons
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
```

### 2. batch_issue_coupons RPC 함수 업데이트
```sql
-- migrations/batch_issue_coupons_rpc.sql 실행 필요
-- expires_at을 서버에서 계산하여 저장하도록 수정
```

## 코드 변경 사항

### 타입 정의
- `lib/supabase.ts`: `UserCoupon` 인터페이스에 `expires_at` 필드 추가

### 유효기간 체크 로직
- `lib/coupons.ts`: `isCouponValid()` 함수가 `expires_at` 우선 사용
- `app/api/coupons/route.ts`: 쿠폰 조회 시 `expires_at` 기반 필터링
- `app/api/coupons/use/route.ts`: 쿠폰 사용 시 `expires_at` 기반 만료 체크

## 보안 개선 효과

1. **인증**: 모든 관리자 API가 서버 사이드에서 인증 확인
2. **데이터 무결성**: 쿠폰 유효기간을 서버에서 계산하여 조작 불가능
3. **중복 방지**: 데이터베이스 레벨에서 중복 발급 방지
4. **검증 강화**: 서버 사이드에서 모든 입력값 검증

## 다음 단계 (선택사항)

1. **JWT 기반 인증**: 현재 쿠키 기반 인증을 JWT로 강화
2. **Rate Limiting**: API 호출 빈도 제한
3. **Audit Log**: 쿠폰 발급/사용 이력 로깅
4. **status 필드**: `user_coupons` 테이블에 `status` 필드 추가 (available/used/expired)

