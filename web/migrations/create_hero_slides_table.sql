-- 히어로 슬라이드 이미지 테이블 생성
CREATE TABLE IF NOT EXISTS hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  link_url TEXT,           -- 슬라이드 클릭 시 이동 경로
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_hero_slides_sort_order ON hero_slides(sort_order);
CREATE INDEX IF NOT EXISTS idx_hero_slides_is_active ON hero_slides(is_active);

-- RLS 활성화 (선택사항)
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능하도록 정책 설정 (필요시)
-- CREATE POLICY "Admin can manage hero slides" ON hero_slides
--   FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');

