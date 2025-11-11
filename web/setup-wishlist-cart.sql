-- 위시리스트(찜) 테이블 생성
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 위시리스트 인덱스
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON wishlists(created_at DESC);

-- 위시리스트 Row Level Security 설정
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- 위시리스트 정책: 사용자는 자신의 위시리스트만 조회/생성/삭제 가능
CREATE POLICY "Users can view their own wishlists"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlists"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlists"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- 장바구니 테이블 생성
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  promotion_type VARCHAR(10),
  promotion_group_id VARCHAR(100),
  discount_percent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 장바구니 인덱스
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_product_id ON carts(product_id);
CREATE INDEX IF NOT EXISTS idx_carts_promotion_group_id ON carts(promotion_group_id);
CREATE INDEX IF NOT EXISTS idx_carts_updated_at ON carts(updated_at DESC);

-- 장바구니 Row Level Security 설정
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- 장바구니 정책: 사용자는 자신의 장바구니만 관리 가능
CREATE POLICY "Users can view their own carts"
  ON carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own carts"
  ON carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own carts"
  ON carts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own carts"
  ON carts FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- carts 테이블에 트리거 적용
DROP TRIGGER IF EXISTS update_carts_updated_at ON carts;
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '위시리스트 및 장바구니 테이블이 성공적으로 생성되었습니다!';
  RAISE NOTICE '- wishlists: 사용자별 찜 목록 저장';
  RAISE NOTICE '- carts: 사용자별 장바구니 저장';
  RAISE NOTICE '- RLS(Row Level Security) 활성화됨';
END $$;

