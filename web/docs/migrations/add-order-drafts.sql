-- 결제 전 주문 초안(draft) 저장. orderId는 서버가 생성하며 토스 결제/confirm과 1:1 연결.
-- Supabase SQL Editor 또는 마이그레이션 도구에서 실행

CREATE TABLE IF NOT EXISTS order_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  amount integer NOT NULL,
  tax_free_amount integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_drafts_expires_at_idx ON order_drafts (expires_at);
CREATE INDEX IF NOT EXISTS order_drafts_user_id_idx ON order_drafts (user_id);

COMMENT ON TABLE order_drafts IS '결제 전 주문 초안. 생성 후 30~60분 미결제 시 만료. confirm 시 주문으로 전환 후 삭제.';
COMMENT ON COLUMN order_drafts.payload IS 'orderInput + 서버 계산 스냅샷(items 가격 등).';
COMMENT ON COLUMN order_drafts.expires_at IS '이 시각 이후 미결제면 만료(confirm 시 400).';
