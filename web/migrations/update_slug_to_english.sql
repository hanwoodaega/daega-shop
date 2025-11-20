-- 기존 slug를 영어로 변환 (한글 제거, 영어/숫자만 남기고 하이픈으로 연결)
-- slug가 상품명과 동일하거나 한글이 포함된 경우를 처리

-- 임시로 unique 제약 조건 제거 (나중에 다시 추가)
DROP INDEX IF EXISTS products_slug_unique;

-- 1단계: slug가 NULL이거나 상품명과 동일한 경우 처리
UPDATE products 
SET slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(name, '[가-힣]', '', 'g'),  -- 한글 제거
      '[^a-zA-Z0-9\s]', '', 'g'                 -- 특수문자 제거 (영어, 숫자, 공백만 남김)
    ),
    '\s+', '-', 'g'                              -- 공백을 하이픈으로
  )
)
WHERE slug IS NULL 
   OR slug = name 
   OR slug ~ '[가-힣]';  -- 한글이 포함된 slug

-- 2단계: 연속된 하이픈을 하나로 통합
UPDATE products
SET slug = regexp_replace(slug, '-+', '-', 'g')
WHERE slug ~ '-{2,}';

-- 3단계: 앞뒤 하이픈 제거
UPDATE products
SET slug = trim(both '-' from slug)
WHERE slug ~ '^-|-$';

-- 4단계: 빈 문자열이거나 너무 짧은 경우 기본값 설정
UPDATE products
SET slug = 'product-' || substring(id::text, 1, 8)
WHERE slug IS NULL 
   OR slug = '' 
   OR length(slug) < 2;

-- 5단계: 중복 slug 처리 (순차적으로 고유하게 만듦)
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
  new_slug TEXT;
  base_slug TEXT;
BEGIN
  -- 각 상품을 순회하면서 중복 체크
  FOR rec IN 
    SELECT id, slug, name
    FROM products
    ORDER BY id
  LOOP
    base_slug := rec.slug;
    
    -- slug가 NULL이거나 빈 문자열이면 name에서 생성
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := lower(
        regexp_replace(
          regexp_replace(
            regexp_replace(rec.name, '[가-힣]', '', 'g'),
            '[^a-zA-Z0-9\s]', '', 'g'
          ),
          '\s+', '-', 'g'
        )
      );
      base_slug := trim(both '-' from regexp_replace(base_slug, '-+', '-', 'g'));
      
      IF base_slug IS NULL OR base_slug = '' OR length(base_slug) < 2 THEN
        base_slug := 'product-' || substring(rec.id::text, 1, 8);
      END IF;
    END IF;
    
    -- 중복 체크 및 고유 slug 생성
    counter := 0;
    new_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM products WHERE slug = new_slug AND id != rec.id) LOOP
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    END LOOP;
    
    -- slug 업데이트
    UPDATE products 
    SET slug = new_slug 
    WHERE id = rec.id;
  END LOOP;
END $$;

-- 6단계: 최종 검증 - slug가 여전히 NULL이거나 빈 문자열인 경우 id 기반으로 생성
UPDATE products
SET slug = 'product-' || substring(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- unique 제약 조건 다시 추가
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON products(slug) WHERE slug IS NOT NULL;

