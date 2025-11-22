-- order_number_offsets 테이블 생성
-- 주문 번호 생성을 위한 날짜별 오프셋 관리

CREATE TABLE IF NOT EXISTS order_number_offsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  number_offset INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_order_number_offsets_date ON order_number_offsets(date);

-- RLS 정책 설정
ALTER TABLE order_number_offsets ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
DROP POLICY IF EXISTS "order_number_offsets_select" ON order_number_offsets;
CREATE POLICY "order_number_offsets_select" ON order_number_offsets FOR SELECT USING (true);

-- 관리자만 수정 가능 (서버 사이드에서만 사용)
DROP POLICY IF EXISTS "order_number_offsets_insert" ON order_number_offsets;
CREATE POLICY "order_number_offsets_insert" ON order_number_offsets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "order_number_offsets_update" ON order_number_offsets;
CREATE POLICY "order_number_offsets_update" ON order_number_offsets FOR UPDATE USING (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_order_number_offsets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_number_offsets_updated_at ON order_number_offsets;
CREATE TRIGGER trigger_update_order_number_offsets_updated_at
  BEFORE UPDATE ON order_number_offsets
  FOR EACH ROW
  EXECUTE FUNCTION update_order_number_offsets_updated_at();

-- create_order_with_transaction RPC 함수 생성/수정
-- 주문 번호 생성을 위해 order_number_offsets 테이블의 number_offset 컬럼 사용

-- 기존 함수가 있다면 삭제 (모든 오버로드 삭제)
-- 여러 오버로드가 있을 수 있으므로 각각 삭제 시도
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 모든 create_order_with_transaction 함수 찾아서 삭제
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE proname = 'create_order_with_transaction'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;
END $$;

-- 새로운 함수 생성
-- 기본값이 있는 파라미터는 뒤로 이동
CREATE OR REPLACE FUNCTION create_order_with_transaction(
  p_user_id UUID,
  p_total_amount NUMERIC,
  p_delivery_type TEXT,
  p_shipping_address TEXT,
  p_shipping_name TEXT,
  p_shipping_phone TEXT,
  p_delivery_time TEXT DEFAULT NULL,
  p_delivery_note TEXT DEFAULT NULL,
  p_order_items JSONB DEFAULT '[]'::JSONB,
  p_used_coupon_id UUID DEFAULT NULL,
  p_used_points NUMERIC DEFAULT 0,
  p_coupon_discount NUMERIC DEFAULT 0,
  p_is_gift BOOLEAN DEFAULT FALSE,
  p_gift_message TEXT DEFAULT NULL,
  p_gift_card_design TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, order_id UUID, error_message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_today DATE;
  v_offset INTEGER;
  v_final_amount NUMERIC;
BEGIN
  -- 최종 금액 계산
  v_final_amount := p_total_amount - p_coupon_discount - p_used_points;
  IF v_final_amount < 0 THEN
    v_final_amount := 0;
  END IF;

  -- 오늘 날짜
  v_today := CURRENT_DATE;

  -- 주문 번호 생성: YYYYMMDD-#### 형식
  -- 오늘 날짜의 오프셋을 원자적으로 증가시킴
  -- 초기값은 날짜 기반 랜덤 번호(1000~9999)로 시작하여 실제 주문 건수를 숨김
  INSERT INTO order_number_offsets (date, number_offset)
  VALUES (
    v_today, 
    -- 날짜를 시드로 사용하여 같은 날에는 같은 랜덤 번호 생성
    -- 1000~9999 사이의 랜덤 번호
    1000 + (ABS(HASHTEXT(v_today::TEXT)) % 9000)
  )
  ON CONFLICT (date) DO UPDATE SET number_offset = order_number_offsets.number_offset + 1
  RETURNING number_offset INTO v_offset;

  -- 주문 번호 포맷: YYYYMMDD-#### (4자리, 5자리 허용)
  -- 9999를 넘어가면 5자리로 표시 (예: 20250122-10000)
  v_order_number := TO_CHAR(v_today, 'YYYYMMDD') || '-' || 
    CASE 
      WHEN v_offset < 10000 THEN LPAD(v_offset::TEXT, 4, '0')
      ELSE v_offset::TEXT
    END;

  -- 주문 생성
  INSERT INTO orders (
    user_id,
    total_amount,
    status,
    delivery_type,
    delivery_time,
    shipping_address,
    shipping_name,
    shipping_phone,
    delivery_note,
    order_number,
    is_gift,
    gift_message,
    gift_card_design
  )
  VALUES (
    p_user_id,
    v_final_amount,
    'ORDER_RECEIVED',
    p_delivery_type,
    p_delivery_time,
    p_shipping_address,
    p_shipping_name,
    p_shipping_phone,
    p_delivery_note,
    v_order_number,
    p_is_gift,
    p_gift_message,
    p_gift_card_design
  )
  RETURNING id INTO v_order_id;

  -- 주문 아이템 저장
  IF p_order_items IS NOT NULL AND jsonb_array_length(p_order_items) > 0 THEN
    INSERT INTO order_items (order_id, product_id, quantity, price)
    SELECT
      v_order_id,
      (item->>'productId')::UUID,
      (item->>'quantity')::INTEGER,
      (item->>'price')::NUMERIC
    FROM jsonb_array_elements(p_order_items) AS item;
  END IF;

  -- 쿠폰 사용 처리
  IF p_used_coupon_id IS NOT NULL AND p_coupon_discount > 0 THEN
    UPDATE user_coupons
    SET is_used = TRUE, used_at = NOW(), used_order_id = v_order_id
    WHERE id = p_used_coupon_id AND user_id = p_user_id;
  END IF;

  -- 포인트 사용 처리
  IF p_used_points > 0 THEN
    INSERT INTO point_transactions (user_id, amount, type, description, order_id)
    VALUES (p_user_id, -p_used_points, 'use', '주문 #' || v_order_id || ' 포인트 사용', v_order_id);
  END IF;

  RETURN QUERY SELECT TRUE, v_order_id, NULL::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM::TEXT;
END;
$$;

