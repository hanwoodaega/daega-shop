-- ==========================================
-- 빠른 테스트 주문 생성 (복사 & 붙여넣기)
-- ==========================================
-- 
-- 사용법:
-- 1. 아래 YOUR_USER_ID 를 실제 사용자 ID로 교체
-- 2. Supabase SQL Editor에 붙여넣고 Run
-- 3. 웹사이트에서 MY > 주문내역 확인
--
-- 사용자 ID 확인:
-- Supabase Dashboard > Authentication > Users > ID 복사
-- ==========================================
SET LOCAL ROLE postgres;
-- 테스트 주문 1: 결제 완료 (2개 상품)
DO $$
DECLARE
  v_user_id UUID := '8bec72d8-d933-4c8d-b9df-4965dc6d92a1';  -- ← 여기를 수정!
  v_order_id UUID;
  v_product_ids UUID[];
BEGIN
  -- 상품 ID 가져오기
  SELECT ARRAY(SELECT id FROM products ORDER BY created_at DESC LIMIT 3) INTO v_product_ids;
  
  IF array_length(v_product_ids, 1) > 0 THEN
    -- 주문 생성
    INSERT INTO orders (user_id, total_amount, status, delivery_type, delivery_time, shipping_address, shipping_name, shipping_phone, delivery_note, created_at)
    VALUES (
      v_user_id,
      196000,
      'paid',
      'regular',
      NULL,
      '전라남도 순천시 해룡면 123',
      '홍길동',
      '01012345678',
      '공동현관 비밀번호 #1234',
      NOW() - INTERVAL '2 days'
    ) RETURNING id INTO v_order_id;
    
    -- 주문 상품 1
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES (v_order_id, v_product_ids[1], 2, 89000);
    
    -- 주문 상품 2 (상품이 2개 이상 있으면)
    IF array_length(v_product_ids, 1) >= 2 THEN
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES (v_order_id, v_product_ids[2], 1, 18000);
    END IF;
    
    RAISE NOTICE '✅ 주문 1 생성 완료 (ID: %)', v_order_id;
  ELSE
    RAISE NOTICE '❌ 상품이 없습니다. 먼저 상품을 생성하세요.';
  END IF;
END $$;

-- 테스트 주문 2: 배송 중 (1개 상품)
DO $$
DECLARE
  v_user_id UUID := '8bec72d8-d933-4c8d-b9df-4965dc6d92a1';  -- ← 여기를 수정!
  v_order_id UUID;
  v_product_id UUID;
BEGIN
  -- 상품 ID 가져오기
  SELECT id INTO v_product_id FROM products ORDER BY created_at DESC LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    -- 주문 생성
    INSERT INTO orders (user_id, total_amount, status, delivery_type, delivery_time, shipping_address, shipping_name, shipping_phone, delivery_note, created_at)
    VALUES (
      v_user_id,
      79000,
      'shipped',
      'quick',
      '19:00~20:00',
      '전라남도 순천시 해룡면 123 101동 101호',
      '김철수',
      '01098765432',
      '부재 시 경비실에 맡겨주세요',
      NOW() - INTERVAL '1 day'
    ) RETURNING id INTO v_order_id;
    
    -- 주문 상품
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES (v_order_id, v_product_id, 1, 79000);
    
    RAISE NOTICE '✅ 주문 2 생성 완료 (ID: %)', v_order_id;
  END IF;
END $$;

-- 테스트 주문 3: 배송 완료 (3개 상품)
DO $$
DECLARE
  v_user_id UUID := '8bec72d8-d933-4c8d-b9df-4965dc6d92a1';  -- ← 여기를 수정!
  v_order_id UUID;
  v_product_ids UUID[];
BEGIN
  -- 상품 ID 가져오기
  SELECT ARRAY(SELECT id FROM products ORDER BY created_at DESC LIMIT 3) INTO v_product_ids;
  
  IF array_length(v_product_ids, 1) > 0 THEN
    -- 주문 생성
    INSERT INTO orders (user_id, total_amount, status, delivery_type, delivery_time, shipping_address, shipping_name, shipping_phone, delivery_note, created_at)
    VALUES (
      v_user_id,
      150000,
      'delivered',
      'pickup',
      '17:00',
      '매장 픽업',
      '이영희',
      '01055556666',
      '오후 5시 이후 픽업 예정',
      NOW() - INTERVAL '5 days'
    ) RETURNING id INTO v_order_id;
    
    -- 주문 상품 1
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES (v_order_id, v_product_ids[1], 2, 50000);
    
    -- 주문 상품 2, 3 (상품이 충분히 있으면)
    IF array_length(v_product_ids, 1) >= 2 THEN
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES (v_order_id, v_product_ids[2], 1, 25000);
    END IF;
    
    IF array_length(v_product_ids, 1) >= 3 THEN
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES (v_order_id, v_product_ids[3], 1, 25000);
    END IF;
    
    RAISE NOTICE '✅ 주문 3 생성 완료 (ID: %)', v_order_id;
  END IF;
END $$;

-- ✅ 완료! 이제 웹사이트에서 MY > 주문내역에서 주문한 상품을 확인할 수 있습니다.

