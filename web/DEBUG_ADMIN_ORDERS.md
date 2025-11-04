# 주문 관리 페이지 에러 디버깅

## 🔍 에러 확인 방법

### 1. 브라우저 개발자 도구 확인
1. **F12** 키를 눌러 개발자 도구 열기
2. **Console** 탭 선택
3. 빨간색 에러 메시지 확인
4. 에러 메시지를 복사해서 알려주세요

### 2. 터미널 (개발 서버) 확인
`npm run dev`를 실행한 터미널에서:
- `❌` 로 시작하는 에러 메시지 찾기
- 에러 메시지를 복사해서 알려주세요

---

## ⚠️ 자주 발생하는 에러들

### 1. "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다"

**해결:**
1. `.env.local` 파일 열기
2. 다음 추가:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
3. 서버 재시작 (Ctrl+C 후 `npm run dev`)

---

### 2. "Could not find the public.users table"

**원인:** `users` 테이블이 없거나 외래 키 관계가 잘못됨

**해결:** 외래 키 이름을 확인해야 합니다. API를 수정하겠습니다.

---

### 3. "relation does not exist"

**원인:** 테이블이나 컬럼이 없음

**해결:** 
1. Supabase 대시보드 → SQL Editor
2. 다음 쿼리 실행:
```sql
-- orders 테이블 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders';

-- users 테이블 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';

-- 외래 키 확인
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'orders' AND tc.constraint_type = 'FOREIGN KEY';
```

---

## 🛠️ 임시 해결책: 외래 키 문제 회피

만약 `users` 테이블과의 조인에서 에러가 발생한다면, 
일단 사용자 정보 없이 주문만 조회하도록 수정할 수 있습니다.

