-- products 테이블에서 사용하지 않는 필드 제거
-- 제거할 필드: description, unit, weight, origin, is_new, is_budget, product_info

-- 1. description 컬럼 제거
ALTER TABLE products DROP COLUMN IF EXISTS description;

-- 2. unit 컬럼 제거
ALTER TABLE products DROP COLUMN IF EXISTS unit;

-- 3. weight 컬럼 제거
ALTER TABLE products DROP COLUMN IF EXISTS weight;

-- 4. origin 컬럼 제거
ALTER TABLE products DROP COLUMN IF EXISTS origin;

-- 5. is_new 컬럼 제거
ALTER TABLE products DROP COLUMN IF EXISTS is_new;

-- 6. is_budget 컬럼 제거
ALTER TABLE products DROP COLUMN IF EXISTS is_budget;

-- 7. product_info 컬럼 제거 (각 상품별 컴포넌트로 대체)
ALTER TABLE products DROP COLUMN IF EXISTS product_info;


