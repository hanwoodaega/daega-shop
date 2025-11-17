-- 선물 포장 옵션 관련 컬럼 제거
-- 이미 추가된 포장 옵션 컬럼들을 제거합니다.

ALTER TABLE orders
DROP COLUMN IF EXISTS gift_wrapping_ribbon,
DROP COLUMN IF EXISTS gift_wrapping_premium_box,
DROP COLUMN IF EXISTS gift_wrapping_handwritten_card,
DROP COLUMN IF EXISTS gift_wrapping_fee;

