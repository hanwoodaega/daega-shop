-- collections 테이블 생성
CREATE TABLE IF NOT EXISTS collections (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  color_theme JSONB,
  sort_order INTEGER DEFAULT 0,
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- collection_products 테이블 생성 (컬렉션과 상품의 연결 테이블)
CREATE TABLE IF NOT EXISTS collection_products (
  id BIGSERIAL PRIMARY KEY,
  collection_id BIGINT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(collection_id, product_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_collections_type ON collections(type);
CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order);
CREATE INDEX IF NOT EXISTS idx_collection_products_collection_id ON collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product_id ON collection_products(product_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_priority ON collection_products(priority);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- collections 테이블의 updated_at 자동 업데이트 트리거
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 (선택사항)
-- INSERT INTO collections (type, title, description, color_theme, sort_order) VALUES
-- ('best', '베스트셀러 한우 추천', '고객이 직접 선택한 가장 인기 있는 상품들입니다.', 
--  '{"background": "#F3E9D7", "accent": "#D9C79E", "title_color": "#2A2A2A", "description_color": "#7A6F62"}'::jsonb, 
--  1),
-- ('sale', '이번 주 특가 추천', '놓치기 아까운 알찬 구성만 모았어요', 
--  '{"background": "#FFF9F0", "accent": "#C02020", "title_color": "#2A2A2A", "description_color": "#7A6F62"}'::jsonb, 
--  2),
-- ('no9', '한우대가 No.9 프리미엄', '가장 자신 있는 한우만, 정직하게 선별했습니다.', 
--  '{"background": "#2F2A26", "accent": "#D9C79E", "title_color": "#F3E9D7", "description_color": "#CBBBA3"}'::jsonb, 
--  3),
-- ('timedeal', '오늘만 특가!', NULL, 
--  '{"background": "#7A001B", "accent": "#FFF7E6", "title_color": "#FFF7E6"}'::jsonb, 
--  0);

