-- 같은 쿠폰을 이미 보유한 사용자에게도 다시 지급할 수 있도록
-- user_coupons의 (user_id, coupon_id) 유니크 제약 제거.
-- 제약 이름은 Supabase/Postgres 기본값 기준이며, 없으면 무시됨.
ALTER TABLE user_coupons
  DROP CONSTRAINT IF EXISTS user_coupons_user_id_coupon_id_key;
