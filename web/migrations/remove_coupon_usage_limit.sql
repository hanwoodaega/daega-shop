-- coupons 테이블에서 usage_limit, usage_count 컬럼 제거
-- 쿠폰은 무조건 한 번만 사용 가능 (user_coupons.is_used로 관리)

ALTER TABLE coupons
DROP COLUMN IF EXISTS usage_limit,
DROP COLUMN IF EXISTS usage_count;

