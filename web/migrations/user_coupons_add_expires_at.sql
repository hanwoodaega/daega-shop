-- user_coupons 테이블에 expires_at 필드 추가
-- 쿠폰 유효기간을 서버에서 계산하여 저장

ALTER TABLE user_coupons
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 기존 데이터에 대해 expires_at 계산 (created_at + coupons.validity_days)
UPDATE user_coupons uc
SET expires_at = (
  uc.created_at + INTERVAL '1 day' * c.validity_days
)
FROM coupons c
WHERE uc.coupon_id = c.id
  AND uc.expires_at IS NULL;

-- 인덱스 추가 (만료된 쿠폰 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_coupons_expires_at ON user_coupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_expires ON user_coupons(user_id, expires_at) WHERE is_used = false;

