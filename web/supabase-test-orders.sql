-- 테스트용 주문 데이터 생성 스크립트
-- 주의: 실제 사용자 ID와 상품 ID가 필요합니다.

-- 1. 먼저 현재 로그인한 사용자 ID 확인
-- Supabase Dashboard > Authentication > Users 에서 사용자 ID 복사

-- 2. 상품 ID 확인
-- SELECT id, name FROM products LIMIT 5;

-- ==========================================
-- 사용법: 아래 YOUR_USER_ID를 실제 사용자 ID로 교체
-- ==========================================

-- 예시: 주문 1 - 결제 완료 상태
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID'; -- ← 여기에 사용자 ID 입력
  v_order_id UUID;
  v_product_ids UUID[];
BEGIN
  -- 상품 ID 가져오기 (최대 3개)
  SELECT ARRAY(SELECT id FROM products LIMIT 3) INTO v_product_ids;
  
  IF array_length(v_product_ids, 1) > 0 THEN
    -- 주문 생성
    INSERT INTO orders (
      user_id,
      total_amount,
      status,
      shipping_address,
      shipping_name,
      shipping_phone,
      created_at
    ) VALUES (
      v_user_id,
      125000,
      'paid',
      '충청남도 천안시 동남구 연향동',
      '홍길동',
      '010-1234-5678',
      NOW() - INTERVAL '2 days'
    ) RETURNING id INTO v_order_id;
    
    -- 주문 아이템 생성 (첫 번째 상품)
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      price
    ) VALUES (
      v_order_id,
      v_product_ids[1],
      2,
      89000
    );
    
    -- 주문 아이템 생성 (두 번째 상품, 있다면)
    IF array_length(v_product_ids, 1) >= 2 THEN
      INSERT INTO order_items (
        order_id,
        product_id,
        quantity,
        price
      ) VALUES (
        v_order_id,
        v_product_ids[2],
        1,
        18000
      );
    END IF;
    
    RAISE NOTICE '주문 1 생성 완료: %', v_order_id;
  END IF;
END $$;

-- 예시: 주문 2 - 배송 중 상태
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID'; -- ← 여기에 사용자 ID 입력
  v_order_id UUID;
  v_product_ids UUID[];
BEGIN
  SELECT ARRAY(SELECT id FROM products LIMIT 3) INTO v_product_ids;
  
  IF array_length(v_product_ids, 1) > 0 THEN
    INSERT INTO orders (
      user_id,
      total_amount,
      status,
      shipping_address,
      shipping_name,
      shipping_phone,
      created_at
    ) VALUES (
      v_user_id,
      79000,
      'shipped',
      '충청남도 천안시 서북구 불당동',
      '김철수',
      '010-9876-5432',
      NOW() - INTERVAL '1 day'
    ) RETURNING id INTO v_order_id;
    
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      price
    ) VALUES (
      v_order_id,
      v_product_ids[1],
      1,
      79000
    );
    
    RAISE NOTICE '주문 2 생성 완료: %', v_order_id;
  END IF;
END $$;

-- 예시: 주문 3 - 배송 완료 상태
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID'; -- ← 여기에 사용자 ID 입력
  v_order_id UUID;
  v_product_ids UUID[];
BEGIN
  SELECT ARRAY(SELECT id FROM products OFFSET 1 LIMIT 3) INTO v_product_ids;
  
  IF array_length(v_product_ids, 1) > 0 THEN
    INSERT INTO orders (
      user_id,
      total_amount,
      status,
      shipping_address,
      shipping_name,
      shipping_phone,
      created_at
    ) VALUES (
      v_user_id,
      150000,
      'delivered',
      '매장 픽업',
      '이영희',
      '010-5555-6666',
      NOW() - INTERVAL '5 days'
    ) RETURNING id INTO v_order_id;
    
    IF array_length(v_product_ids, 1) >= 1 THEN
      INSERT INTO order_items (
        order_id,
        product_id,
        quantity,
        price
      ) VALUES (
        v_order_id,
        v_product_ids[1],
        3,
        50000
      );
    END IF;
    
    RAISE NOTICE '주문 3 생성 완료: %', v_order_id;
  END IF;
END $$;

-- ==========================================
-- 간단 버전 (한 번에 실행)
-- ==========================================

-- 아래 명령어로 현재 사용자 ID와 상품 ID 확인
SELECT 'User ID:', id, email FROM auth.users LIMIT 1;
SELECT 'Product IDs:', id, name FROM products LIMIT 5;

-- 확인 후 위 스크립트의 YOUR_USER_ID를 교체하고 실행


