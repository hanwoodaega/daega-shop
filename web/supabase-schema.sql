-- 대가 정육백화점 데이터베이스 스키마

-- 상품 테이블
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category VARCHAR(100) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'kg',
  weight DECIMAL(10, 2) NOT NULL DEFAULT 1.0,
  origin VARCHAR(100) NOT NULL DEFAULT '국내산',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 카테고리: 한우, 돼지고기, 수입육, 가공육, 특수부위 등

-- 장바구니 테이블
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- 주문 테이블
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  shipping_name VARCHAR(100) NOT NULL,
  shipping_phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 주문 상태: pending, paid, shipped, delivered, cancelled

-- 주문 아이템 테이블
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 샘플 데이터 삽입
INSERT INTO products (name, description, price, image_url, category, stock, unit, weight, origin) VALUES
('한우 1++ 등심', '최고급 한우 등심으로 부드럽고 육즙이 풍부합니다.', 89000, 'https://via.placeholder.com/400x300?text=한우등심', '한우', 50, 'kg', 1.0, '국내산 한우'),
('한우 1++ 안심', '연하고 부드러운 한우 안심입니다.', 95000, 'https://via.placeholder.com/400x300?text=한우안심', '한우', 30, 'kg', 1.0, '국내산 한우'),
('한우 1++ 채끝', '담백하고 고소한 한우 채끝입니다.', 79000, 'https://via.placeholder.com/400x300?text=한우채끝', '한우', 40, 'kg', 1.0, '국내산 한우'),
('돼지 삼겹살', '신선한 국내산 돼지 삼겹살입니다.', 18000, 'https://via.placeholder.com/400x300?text=삼겹살', '돼지고기', 100, 'kg', 1.0, '국내산'),
('돼지 목살', '부드럽고 육즙이 풍부한 목살입니다.', 15000, 'https://via.placeholder.com/400x300?text=목살', '돼지고기', 80, 'kg', 1.0, '국내산'),
('소갈비', '마블링이 좋은 LA갈비입니다.', 45000, 'https://via.placeholder.com/400x300?text=소갈비', '수입육', 60, 'kg', 1.0, '미국산'),
('척아이롤', '풍부한 마블링의 척아이롤입니다.', 39000, 'https://via.placeholder.com/400x300?text=척아이롤', '수입육', 70, 'kg', 1.0, '호주산'),
('불고기용 한우', '불고기에 최적화된 한우입니다.', 35000, 'https://via.placeholder.com/400x300?text=불고기', '한우', 90, 'kg', 1.0, '국내산 한우');

-- RLS (Row Level Security) 활성화 (선택사항)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (상품은 모두가 볼 수 있음)
-- CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

-- 장바구니는 본인 것만 조회/수정 가능
-- CREATE POLICY "Users can view their own cart items" ON cart_items FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert their own cart items" ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update their own cart items" ON cart_items FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete their own cart items" ON cart_items FOR DELETE USING (auth.uid() = user_id);

