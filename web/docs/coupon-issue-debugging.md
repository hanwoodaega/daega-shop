# 쿠폰 지급 후 사용자에게 보이지 않는 문제 진단

## 문제 증상
- 쿠폰이 DB에 저장되었지만 사용자에게 보이지 않음

## 가능한 원인

### 1. 쿠폰 정보 JOIN 실패 (가장 가능성 높음)
**원인**: RLS 정책으로 인해 `coupons` 테이블 조회 실패
- `user_coupons`는 조회되지만 `coupons` 테이블 JOIN이 실패
- `coupon` 필드가 `null`이 되어 필터링됨

**확인 방법**:
```sql
-- 쿠폰이 실제로 저장되었는지 확인
SELECT uc.*, c.name, c.is_active 
FROM user_coupons uc
LEFT JOIN coupons c ON uc.coupon_id = c.id
WHERE uc.user_id = '사용자ID';
```

**해결 방법**:
- `coupons` 테이블에 RLS 정책이 있다면, 모든 사용자가 활성 쿠폰을 조회할 수 있는 정책 추가 필요
- 또는 서버 사이드에서 `createSupabaseAdminClient()` 사용 (현재는 `createSupabaseServerClient()` 사용 중)

### 2. 쿠폰 비활성화
**원인**: 쿠폰이 `is_active = false`로 설정됨
- 관리자가 쿠폰을 비활성화했을 수 있음

**확인 방법**:
```sql
SELECT id, name, is_active 
FROM coupons 
WHERE id = '쿠폰ID';
```

### 3. 만료일 문제
**원인**: `expires_at`이 과거 날짜이거나 null
- 서버에서 만료일 계산이 잘못되었을 수 있음

**확인 방법**:
```sql
SELECT id, user_id, coupon_id, expires_at, created_at, is_used
FROM user_coupons
WHERE user_id = '사용자ID' AND coupon_id = '쿠폰ID';
```

### 4. 쿠폰이 사용됨
**원인**: `is_used = true`로 설정됨
- 이미 사용한 쿠폰은 기본적으로 필터링됨

## 디버깅 방법

### 1. 서버 로그 확인
개발 환경에서 다음 로그를 확인:
- `쿠폰 조회 성공: user_id=..., count=...`
- `쿠폰 정보 없음: ...`
- `비활성화된 쿠폰: ...`
- `유효하지 않은 쿠폰: ...`

### 2. API 응답 확인
브라우저 DevTools → Network → `/api/coupons` 응답 확인:
```json
{
  "coupons": [...],
  "debug": {
    "total": 5,      // 전체 조회된 쿠폰 수
    "valid": 2,      // 유효한 쿠폰 수
    "filtered": 3    // 필터링된 쿠폰 수
  }
}
```

### 3. DB 직접 확인
```sql
-- 사용자의 모든 쿠폰 확인
SELECT 
  uc.id as user_coupon_id,
  uc.user_id,
  uc.coupon_id,
  uc.is_used,
  uc.expires_at,
  uc.created_at,
  c.name as coupon_name,
  c.is_active,
  c.validity_days
FROM user_coupons uc
LEFT JOIN coupons c ON uc.coupon_id = c.id
WHERE uc.user_id = '사용자ID'
ORDER BY uc.created_at DESC;
```

## 해결 방법

### RLS 정책 확인 및 수정
`coupons` 테이블에 다음 정책이 필요:
```sql
-- 모든 사용자가 활성 쿠폰 조회 가능
CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
USING (is_active = true);
```

또는 서버 사이드에서 admin client 사용 (권장):
- 현재: `createSupabaseServerClient()` 사용
- 변경: `createSupabaseAdminClient()` 사용 (RLS 우회)

## 현재 코드 상태

### 쿠폰 조회 API (`app/api/coupons/route.ts`)
- ✅ LEFT JOIN 사용 (쿠폰 정보가 없어도 조회 가능)
- ✅ 디버깅 로그 추가
- ✅ 필터링 원인 로그

### 개선 사항
- 쿠폰 정보가 없을 때 경고 로그 출력
- 비활성화된 쿠폰 경고 로그 출력
- 만료일 체크 상세 로그 출력

