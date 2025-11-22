-- 타임딜 구조 변경: products 테이블의 타임딜 시간을 flash_sale_settings로 이동
-- 모든 타임딜 상품이 같은 시간을 공유하도록 변경

-- 1. flash_sale_settings 테이블에 start_time, end_time 컬럼 추가
DO $$
BEGIN
  -- start_time 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flash_sale_settings' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE flash_sale_settings ADD COLUMN start_time TIMESTAMPTZ;
    RAISE NOTICE 'flash_sale_settings.start_time 컬럼이 추가되었습니다.';
  END IF;

  -- end_time 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flash_sale_settings' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE flash_sale_settings ADD COLUMN end_time TIMESTAMPTZ;
    RAISE NOTICE 'flash_sale_settings.end_time 컬럼이 추가되었습니다.';
  END IF;
END $$;

-- 2. 기존 products 테이블의 타임딜 시간 데이터를 flash_sale_settings로 마이그레이션
-- (가장 최근 타임딜 시간을 사용, 컬럼이 존재하는 경우에만)
DO $$
DECLARE
  latest_start_time TIMESTAMPTZ;
  latest_end_time TIMESTAMPTZ;
  has_start_time_col BOOLEAN;
  has_end_time_col BOOLEAN;
BEGIN
  -- 컬럼 존재 여부 확인
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'flash_sale_start_time'
  ) INTO has_start_time_col;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'flash_sale_end_time'
  ) INTO has_end_time_col;

  -- flash_sale_end_time 컬럼이 존재하는 경우에만 마이그레이션
  IF has_end_time_col THEN
    -- 가장 최근 타임딜 종료 시간 찾기
    EXECUTE format('SELECT MAX(flash_sale_end_time) FROM products WHERE flash_sale_end_time IS NOT NULL')
    INTO latest_end_time;

    -- 해당 종료 시간과 같은 그룹의 시작 시간 찾기
    IF latest_end_time IS NOT NULL THEN
      IF has_start_time_col THEN
        EXECUTE format('SELECT MAX(flash_sale_start_time) FROM products WHERE flash_sale_end_time = $1')
        USING latest_end_time
        INTO latest_start_time;
      END IF;

      -- flash_sale_settings에 저장 (id=1인 레코드가 없으면 생성, 있으면 업데이트)
      INSERT INTO flash_sale_settings (id, start_time, end_time)
      VALUES (1, latest_start_time, latest_end_time)
      ON CONFLICT (id) DO UPDATE
      SET 
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time;
      
      RAISE NOTICE '기존 타임딜 시간이 flash_sale_settings로 마이그레이션되었습니다.';
    ELSE
      RAISE NOTICE '마이그레이션할 타임딜 시간 데이터가 없습니다.';
    END IF;
  ELSE
    RAISE NOTICE 'flash_sale_end_time 컬럼이 존재하지 않아 마이그레이션을 건너뜁니다.';
  END IF;
END $$;

-- 3. products 테이블에서 flash_sale_start_time, flash_sale_end_time 컬럼 제거
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'flash_sale_start_time'
  ) THEN
    ALTER TABLE products DROP COLUMN flash_sale_start_time;
    RAISE NOTICE 'products.flash_sale_start_time 컬럼이 제거되었습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'flash_sale_end_time'
  ) THEN
    ALTER TABLE products DROP COLUMN flash_sale_end_time;
    RAISE NOTICE 'products.flash_sale_end_time 컬럼이 제거되었습니다.';
  END IF;
END $$;

-- 4. flash_sale_price 컬럼 제거 및 is_flash_sale boolean 플래그 추가
DO $$
BEGIN
  -- flash_sale_price 컬럼 제거
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'flash_sale_price'
  ) THEN
    ALTER TABLE products DROP COLUMN flash_sale_price;
    RAISE NOTICE 'products.flash_sale_price 컬럼이 제거되었습니다.';
  END IF;

  -- is_flash_sale boolean 플래그 추가 (타임딜 여부만 체크)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_flash_sale'
  ) THEN
    ALTER TABLE products ADD COLUMN is_flash_sale BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'products.is_flash_sale 컬럼이 추가되었습니다.';
  END IF;
END $$;

