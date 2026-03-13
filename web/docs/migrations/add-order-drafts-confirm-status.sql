-- order_drafts에 토스 승인 결과 저장 (승인 성공 후 주문 생성 전 상태 보존 → 복구용)
-- Supabase SQL Editor 또는 마이그레이션 도구에서 실행

ALTER TABLE order_drafts
  ADD COLUMN IF NOT EXISTS toss_payment_key text,
  ADD COLUMN IF NOT EXISTS toss_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirm_status text;

COMMENT ON COLUMN order_drafts.toss_payment_key IS '토스 결제 승인 시 paymentKey. 복구/중복 처리용.';
COMMENT ON COLUMN order_drafts.toss_approved_at IS '토스 승인 성공 시각.';
COMMENT ON COLUMN order_drafts.confirm_status IS 'approved_not_persisted: 승인됐으나 주문 미생성(복구 대상).';

-- paymentKey 기준 유일 (1결제 1draft). NULL은 여러 개 허용
CREATE UNIQUE INDEX IF NOT EXISTS order_drafts_toss_payment_key_key
  ON order_drafts (toss_payment_key)
  WHERE toss_payment_key IS NOT NULL;
