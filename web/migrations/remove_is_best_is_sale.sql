-- is_best, is_sale 컬럼 제거
-- 컬렉션 시스템으로 대체되었으므로 더 이상 필요하지 않음

ALTER TABLE products DROP COLUMN IF EXISTS is_best;
ALTER TABLE products DROP COLUMN IF EXISTS is_sale;



