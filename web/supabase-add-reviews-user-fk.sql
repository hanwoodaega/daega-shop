-- reviews 테이블과 users 테이블 간의 외래키 관계 추가
-- 이미 존재하는 외래키가 있을 수 있으므로 먼저 확인 후 추가

-- 1. 기존 외래키 제약조건 확인 (있으면 삭제)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_user_id_fkey' 
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE reviews DROP CONSTRAINT reviews_user_id_fkey;
    END IF;
END $$;

-- 2. updated_at 컬럼 추가 (없을 경우만)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reviews' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. 외래키 제약조건 추가
ALTER TABLE reviews
ADD CONSTRAINT reviews_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- 4. updated_at 자동 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용 (이미 있으면 삭제 후 재생성)
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 인덱스 확인 및 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- 성능 향상을 위한 추가 인덱스들
CREATE INDEX IF NOT EXISTS idx_reviews_product_id_created_at ON reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- users 테이블 인덱스 (이름 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- products 테이블 인덱스 (리뷰 관련 컬럼)
CREATE INDEX IF NOT EXISTS idx_products_id ON products(id);

-- 완료 메시지
DO $$ 
BEGIN
    RAISE NOTICE 'Foreign key relationship between reviews and users has been created successfully!';
    RAISE NOTICE 'updated_at column and auto-update trigger have been configured!';
    RAISE NOTICE 'Performance indexes have been created!';
END $$;

