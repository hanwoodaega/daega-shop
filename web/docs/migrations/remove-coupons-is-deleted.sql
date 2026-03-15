-- coupons 테이블에서 is_deleted 컬럼 제거. is_active만 사용.
-- RLS 정책이 is_deleted를 참조하므로 정책을 먼저 제거한 뒤 컬럼 제거, 정책 재생성.

DROP POLICY IF EXISTS "Anyone can view active coupons" ON coupons;

ALTER TABLE coupons
  DROP COLUMN IF EXISTS is_deleted;

-- 활성 쿠폰만 조회 가능 (is_active 기준)
CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (is_active = true);
