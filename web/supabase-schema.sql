-- 대가 정육백화점 데이터베이스 스키마

-- 사용자 프로필 테이블 (auth.users와 연동)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  phone VARCHAR(20),
  profile_image TEXT,
  provider VARCHAR(50) DEFAULT 'email',
  naver_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- auth.users에 사용자가 생성되면 자동으로 public.users에도 추가
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone, provider, profile_image, naver_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    NEW.raw_user_meta_data->>'profile_image',
    NEW.raw_user_meta_data->>'naver_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- 배송지 테이블
CREATE TABLE addresses (
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
  delivery_type VARCHAR(20) NOT NULL DEFAULT 'regular',
  delivery_time VARCHAR(50) DEFAULT NULL,
  shipping_address TEXT NOT NULL,
  shipping_name VARCHAR(100) NOT NULL,
  shipping_phone VARCHAR(20) NOT NULL,
  delivery_note TEXT DEFAULT NULL,
  refund_status VARCHAR(20) DEFAULT NULL,
  refund_amount DECIMAL(10, 2) DEFAULT NULL,
  refund_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  refund_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_delivery_type CHECK (delivery_type IN ('pickup', 'quick', 'regular')),
  CONSTRAINT check_refund_status CHECK (refund_status IN (NULL, 'pending', 'processing', 'completed'))
);

-- 주문 상태: pending, paid, shipped, delivered, cancelled
-- 배달 유형: pickup(픽업), quick(퀵배달), regular(택배배달)
-- 배달 시간: 픽업/퀵배달 시 사용 (예: "15:00", "19:00~20:00")
-- 환불 상태: pending(환불대기), processing(환불처리중), completed(환불완료)

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
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(user_id, is_default);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery_type ON orders(delivery_type);
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

-- 인덱스 생성 (users 테이블)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_naver_id ON users(naver_id);

-- 기본 배송지 자동 관리 함수
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

-- Trigger 생성
DROP TRIGGER IF EXISTS ensure_single_default_address ON addresses;
CREATE TRIGGER ensure_single_default_address
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_default_address();

-- RLS (Row Level Security) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 사용자 정책
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- 공개 읽기 정책 (상품은 모두가 볼 수 있음)
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

-- 배송지는 본인 것만 조회/수정 가능
CREATE POLICY "Users can view their own addresses" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own addresses" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own addresses" ON addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own addresses" ON addresses FOR DELETE USING (auth.uid() = user_id);

-- 장바구니는 본인 것만 조회/수정 가능
CREATE POLICY "Users can view their own cart items" ON cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cart items" ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart items" ON cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cart items" ON cart_items FOR DELETE USING (auth.uid() = user_id);

-- 주문은 본인 것만 조회/생성 가능
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);

