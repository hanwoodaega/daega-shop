-- ==========================================
-- 배송지 관리 테이블 추가
-- ==========================================
--
-- 사용법:
-- Supabase SQL Editor에서 실행
-- ==========================================

-- 1. addresses 테이블 생성
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) DEFAULT '배송지',
  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  zipcode VARCHAR(10),
  address TEXT NOT NULL,
  address_detail TEXT,
  delivery_note TEXT DEFAULT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(user_id, is_default);

-- 3. RLS 활성화
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성
DO $$ 
BEGIN
  -- 사용자는 자신의 배송지만 조회
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'addresses' 
    AND policyname = 'Users can view their own addresses'
  ) THEN
    CREATE POLICY "Users can view their own addresses" 
    ON addresses FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
  
  -- 사용자는 자신의 배송지만 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'addresses' 
    AND policyname = 'Users can insert their own addresses'
  ) THEN
    CREATE POLICY "Users can insert their own addresses" 
    ON addresses FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
  
  -- 사용자는 자신의 배송지만 수정
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'addresses' 
    AND policyname = 'Users can update their own addresses'
  ) THEN
    CREATE POLICY "Users can update their own addresses" 
    ON addresses FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
  
  -- 사용자는 자신의 배송지만 삭제
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'addresses' 
    AND policyname = 'Users can delete their own addresses'
  ) THEN
    CREATE POLICY "Users can delete their own addresses" 
    ON addresses FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. 기본 배송지 설정 시 다른 배송지의 is_default를 false로 변경하는 함수
CREATE OR REPLACE FUNCTION set_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE addresses 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger 생성 (기본 배송지 자동 관리)
DROP TRIGGER IF EXISTS ensure_single_default_address ON addresses;
CREATE TRIGGER ensure_single_default_address
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_default_address();

-- ✅ 완료! addresses 테이블이 생성되었습니다.

-- 확인 쿼리:
-- SELECT * FROM addresses WHERE user_id = 'YOUR_USER_ID';

