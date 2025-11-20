-- create_order_with_transaction 함수에서 포인트 적립 로직 제거
-- 포인트 적립은 구매확정 시(/api/orders/confirm)에만 이루어져야 합니다.

CREATE OR REPLACE FUNCTION public.create_order_with_transaction(
  p_user_id uuid, 
  p_total_amount integer, 
  p_delivery_type text, 
  p_delivery_time text, 
  p_shipping_address text, 
  p_shipping_name text, 
  p_shipping_phone text, 
  p_delivery_note text, 
  p_order_items jsonb, 
  p_used_coupon_id uuid DEFAULT NULL::uuid, 
  p_used_points integer DEFAULT 0, 
  p_coupon_discount integer DEFAULT 0
)
RETURNS TABLE(order_id uuid, success boolean, error_message text)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_order_id UUID;
  v_final_amount INTEGER;
  v_user_coupon_record RECORD;
  v_coupon_record RECORD;
  v_user_points_record RECORD;
  v_order_status TEXT;
BEGIN
  -- 트랜잭션 시작 (자동)
  
  -- 1. 최종 금액 계산
  v_final_amount := p_total_amount - p_coupon_discount - p_used_points;
  IF v_final_amount < 0 THEN
    v_final_amount := 0;
  END IF;
  
  -- 2. 주문 상태 결정 (기본값: paid)
  v_order_status := 'paid';
  
  -- 3. 주문 생성
  INSERT INTO orders (
    user_id,
    total_amount,
    status,
    delivery_type,
    delivery_time,
    shipping_address,
    shipping_name,
    shipping_phone,
    delivery_note
  ) VALUES (
    p_user_id,
    v_final_amount,
    v_order_status,
    p_delivery_type,
    p_delivery_time,
    p_shipping_address,
    p_shipping_name,
    p_shipping_phone,
    p_delivery_note
  ) RETURNING id INTO v_order_id;
  
  -- 4. 주문 아이템 저장
  INSERT INTO order_items (order_id, product_id, quantity, price)
  SELECT 
    v_order_id,
    (item->>'productId')::UUID,
    (item->>'quantity')::INTEGER,
    (item->>'price')::INTEGER
  FROM jsonb_array_elements(p_order_items) AS item;
  
  -- 5. 쿠폰 사용 처리
  IF p_used_coupon_id IS NOT NULL AND p_coupon_discount > 0 THEN
    -- 쿠폰 사용 여부 업데이트
    UPDATE user_coupons
    SET 
      is_used = true,
      used_at = NOW(),
      order_id = v_order_id
    WHERE 
      id = p_used_coupon_id
      AND user_id = p_user_id
      AND is_used = false;
    
    -- 쿠폰이 실제로 업데이트되었는지 확인
    IF NOT FOUND THEN
      RAISE EXCEPTION '쿠폰을 사용할 수 없습니다. (이미 사용되었거나 존재하지 않음)';
    END IF;
    
    -- 쿠폰 사용 횟수 증가
    UPDATE coupons
    SET usage_count = usage_count + 1
    WHERE id = (
      SELECT coupon_id FROM user_coupons WHERE id = p_used_coupon_id
    );
  END IF;
  
  -- 6. 포인트 사용 처리
  IF p_used_points > 0 THEN
    -- 포인트 차감
    UPDATE user_points
    SET 
      total_points = total_points - p_used_points,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- 포인트 부족 체크
    IF NOT FOUND THEN
      RAISE EXCEPTION '포인트 정보를 찾을 수 없습니다.';
    END IF;
    
    IF (SELECT total_points FROM user_points WHERE user_id = p_user_id) < 0 THEN
      RAISE EXCEPTION '포인트가 부족합니다.';
    END IF;
    
    -- 포인트 사용 내역 기록
    INSERT INTO point_history (
      user_id,
      points,
      type,
      description,
      order_id
    ) VALUES (
      p_user_id,
      -p_used_points,
      'usage',
      '주문 #' || v_order_id::TEXT || ' 포인트 사용',
      v_order_id
    );
  END IF;
  
  -- 7. 포인트 적립은 구매확정 시에만 처리됩니다 (배송완료 후 구매확정 버튼 클릭 시)
  -- 주문 생성 시에는 포인트를 적립하지 않습니다.
  
  -- 성공 반환
  RETURN QUERY SELECT v_order_id, true, NULL::TEXT;
  
EXCEPTION
  WHEN OTHERS THEN
    -- 에러 발생 시 자동 롤백 (트랜잭션)
    RETURN QUERY SELECT NULL::UUID, false, SQLERRM;
END;
$function$;

