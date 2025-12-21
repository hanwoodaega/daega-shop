-- 카테고리 테이블 생성
-- 주의: type은 'best', 'sale', 'no9'만 허용됩니다.
-- 각 타입은 고유한 페이지(/best, /sale, /no9)와 UI를 가지고 있습니다.
-- sort_order는 필요 없음 (3개만 존재하고 순서가 고정됨)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE CHECK (type IN ('best', 'sale', 'no9')),
  title TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 카테고리 상품 연결 테이블 생성
CREATE TABLE IF NOT EXISTS category_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, product_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_category_products_category_id ON category_products(category_id);
CREATE INDEX IF NOT EXISTS idx_category_products_product_id ON category_products(product_id);
CREATE INDEX IF NOT EXISTS idx_category_products_priority ON category_products(priority);
CREATE INDEX IF NOT EXISTS idx_category_products_category_priority ON category_products(category_id, priority);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 초기 카테고리 데이터 삽입 (선택사항)
INSERT INTO categories (type, title, description, is_active)
VALUES 
  ('best', '베스트', '베스트 상품', true),
  ('sale', '특가', '특가 상품', true),
  ('no9', '한우대가 NO.9', '한우대가 NO.9 상품', true)
ON CONFLICT (type) DO NOTHING;

-- RLS (Row Level Security) 정책 설정
-- categories 테이블: 모든 사용자가 활성 카테고리 조회 가능
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 사용자가 활성 카테고리 조회 가능"
  ON categories
  FOR SELECT
  USING (is_active = true);

-- category_products 테이블: 모든 사용자가 조회 가능 (공개 데이터)
ALTER TABLE category_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 사용자가 카테고리 상품 조회 가능"
  ON category_products
  FOR SELECT
  USING (true);

-- 주의: 관리자 작업(INSERT/UPDATE/DELETE)은 service_role 키를 사용하므로 RLS를 우회합니다.
-- 따라서 관리자 API에서는 RLS 정책이 적용되지 않습니다.

