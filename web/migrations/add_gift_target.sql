-- 선물 대상 필드 추가 (배열 타입)
-- 최소한의 DB 변경으로 선물관 페이지 기능 구현

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gift_target text[];

-- 선물관 표시 순서 필드 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gift_display_order integer;

-- 예산 카테고리 필드 추가 (배열 타입)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gift_budget_targets text[];

-- 예산별 표시 순서 필드 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gift_budget_order integer;

-- 실시간 인기 선물세트 여부 필드 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gift_featured boolean DEFAULT false;

-- 실시간 인기 선물세트 우선순위 필드 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gift_featured_order integer;

-- 기존 데이터에는 null로 유지 (기존 데이터에 영향 없음)
-- 관리자 페이지에서 상품 수정 시 선물 대상을 선택할 수 있음
-- 선물관 관리 페이지에서 상품 순서를 조정할 수 있음

