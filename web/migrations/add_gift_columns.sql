-- 선물하기 기능을 위한 orders 테이블 컬럼 추가
-- 이 마이그레이션은 선택사항입니다. 컬럼이 없으면 JSON 필드(gift_info)에 저장됩니다.

-- 방법 1: 개별 컬럼으로 저장 (권장)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gift_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS gift_message TEXT,
ADD COLUMN IF NOT EXISTS gift_card_design TEXT CHECK (gift_card_design IN ('birthday', 'anniversary', 'thanks', 'custom')),
ADD COLUMN IF NOT EXISTS gift_expires_at TIMESTAMP WITH TIME ZONE;

-- 방법 2: JSON 필드로 저장 (대안)
-- 컬럼 추가가 어려운 경우 이 방법을 사용할 수 있습니다.
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_info JSONB;

-- 인덱스 추가 (선택사항)
CREATE INDEX IF NOT EXISTS idx_orders_is_gift ON orders(is_gift);
CREATE INDEX IF NOT EXISTS idx_orders_gift_token ON orders(gift_token) WHERE gift_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_gift_expires_at ON orders(gift_expires_at) WHERE gift_expires_at IS NOT NULL;

