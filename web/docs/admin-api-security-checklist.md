# 관리자 API 보안 체크리스트

## ✅ 필수 사항: Service Role Key 사용

### 중요 원칙
**모든 관리자 API는 반드시 `createSupabaseAdminClient()`를 사용해야 합니다.**
- `createSupabaseAdminClient()` = `SUPABASE_SERVICE_ROLE_KEY` 사용 = RLS 우회
- `createSupabaseServerClient()` = `NEXT_PUBLIC_SUPABASE_ANON_KEY` 사용 = RLS 적용

### 현재 상태 확인

#### ✅ 쿠폰 관리 API (올바르게 설정됨)
- `app/api/admin/coupons/route.ts` - ✅ `createSupabaseAdminClient()` 사용
- `app/api/admin/coupons/[id]/route.ts` - ✅ `createSupabaseAdminClient()` 사용
- `app/api/admin/coupons/issue/route.ts` - ✅ `createSupabaseAdminClient()` 사용

#### ⚠️ 다른 관리자 API 확인 필요
다음 파일들도 확인 필요:
- `app/api/admin/reviews/route.ts` - ⚠️ `createSupabaseServerClient()` 사용 중
- `app/api/admin/reviews/[id]/route.ts` - ⚠️ 일부 `createSupabaseServerClient()` 사용

## RLS 정책과 관리자 API의 관계

### RLS 정책의 역할
RLS 정책은 **일반 사용자 접근**만 제한합니다:
- ✅ 사용자는 자신의 쿠폰만 조회 가능
- ✅ 사용자는 활성 쿠폰만 조회 가능
- ❌ 사용자는 쿠폰 생성/수정/삭제 불가

### 관리자 API의 역할
관리자 API는 **service_role 키**로 RLS를 우회합니다:
- ✅ 모든 쿠폰 조회 가능
- ✅ 쿠폰 생성/수정/삭제 가능
- ✅ 모든 사용자에게 쿠폰 발급 가능

### 보안 이중 검증
1. **RLS 정책**: 일반 사용자 접근 차단
2. **관리자 인증**: `assertAdmin()` 함수로 쿠키 기반 인증 확인
3. **Service Role Key**: RLS 우회하여 관리 작업 수행

## 체크리스트

### 쿠폰 관리 작업
- [x] 쿠폰 생성 (INSERT) - `createSupabaseAdminClient()` 사용 ✅
- [x] 쿠폰 수정 (UPDATE) - `createSupabaseAdminClient()` 사용 ✅
- [x] 쿠폰 삭제 (DELETE) - `createSupabaseAdminClient()` 사용 ✅
- [x] 쿠폰 조회 (SELECT) - `createSupabaseAdminClient()` 사용 ✅
- [x] 쿠폰 발급 (user_coupons INSERT) - `createSupabaseAdminClient()` 사용 ✅

### 일반 사용자 작업
- [x] 쿠폰 조회 (SELECT) - `createSupabaseServerClient()` 사용 ✅ (RLS 적용)
- [x] 쿠폰 사용 (UPDATE) - `createSupabaseServerClient()` 사용 ✅ (RLS 적용)

## 주의사항

### ❌ 절대 하지 말아야 할 것
```typescript
// ❌ 잘못된 예시
const supabase = createSupabaseServerClient()  // anon key 사용
await supabase.from('coupons').insert({...})  // RLS로 막힐 수 있음
```

### ✅ 올바른 방법
```typescript
// ✅ 올바른 예시
assertAdmin()  // 관리자 인증 확인
const supabase = createSupabaseAdminClient()  // service_role key 사용
await supabase.from('coupons').insert({...})  // RLS 우회
```

## 환경 변수 확인

다음 환경 변수가 설정되어 있는지 확인:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # ⚠️ 서버 사이드에서만 사용, 절대 클라이언트에 노출 금지
```

## 테스트 방법

### 1. 관리자 쿠폰 생성 테스트
```bash
# 관리자 로그인 후 쿠폰 생성 시도
# 성공하면: service_role 키 사용 중
# 실패하면: anon key 사용 중 (RLS 차단)
```

### 2. RLS 정책 테스트
```sql
-- 일반 사용자로 쿠폰 생성 시도 (실패해야 함)
-- 관리자로 쿠폰 생성 시도 (성공해야 함)
```

## 결론

✅ **현재 쿠폰 관리 API는 모두 올바르게 설정되어 있습니다.**
- 모든 관리자 쿠폰 API가 `createSupabaseAdminClient()` 사용
- RLS 정책으로 일반 사용자 접근 차단
- Service Role Key로 관리자 작업 수행

⚠️ **다른 관리자 API도 확인 필요**
- reviews, products, orders 등 다른 관리자 API도 동일한 패턴 적용 필요

