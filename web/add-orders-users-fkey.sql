-- orders 테이블과 users 테이블 간의 외래 키 생성
-- 이렇게 하면 관리자 페이지에서 고객의 이메일 정보도 볼 수 있습니다

-- 1. 기존 외래 키가 있는지 확인
SELECT 
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'orders' 
  AND constraint_type = 'FOREIGN KEY';

-- 2. orders 테이블의 user_id 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'user_id';

-- 3. users 테이블 존재 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'users';

-- 4. 외래 키 생성
-- ⚠️ 주의: 이미 외래 키가 있으면 에러가 발생합니다
-- 에러가 나면 무시하고 넘어가세요
ALTER TABLE orders
ADD CONSTRAINT orders_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- 5. 외래 키 생성 확인
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

-- 완료!
-- 이제 API 코드에서 users 조인을 다시 활성화할 수 있습니다

