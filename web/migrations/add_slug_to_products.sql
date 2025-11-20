-- 상품 테이블에 slug 필드 추가
-- slug는 URL-friendly한 고유 식별자로 사용됩니다.

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS slug text;

-- slug에 unique 제약 조건 추가 (중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON products(slug) WHERE slug IS NOT NULL;

-- 기존 상품에 대한 slug 자동 생성 (선택사항)
-- UPDATE products SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9가-힣\s]', '', 'g')) WHERE slug IS NULL;

