-- 타임딜 테이블 생성
CREATE TABLE timedeals (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         text NOT NULL,                      -- 표시할 제목 (예: "오늘만 특가!")
  description   text,                               -- 선택 (UI에서 사용 가능)
  start_at      timestamptz NOT NULL,               -- 타임딜 시작 시각
  end_at        timestamptz NOT NULL,               -- 타임딜 종료 시각
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 타임딜 상품 테이블 생성
CREATE TABLE timedeal_products (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timedeal_id   bigint NOT NULL REFERENCES timedeals(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_percent integer DEFAULT 0,   -- 타임딜 전용 할인율
  sort_order    integer DEFAULT 0       -- 노출 순서
);

-- 인덱스 생성
CREATE INDEX idx_timedeals_start_at ON timedeals(start_at);
CREATE INDEX idx_timedeals_end_at ON timedeals(end_at);
CREATE INDEX idx_timedeal_products_timedeal_id ON timedeal_products(timedeal_id);
CREATE INDEX idx_timedeal_products_product_id ON timedeal_products(product_id);
CREATE INDEX idx_timedeal_products_sort_order ON timedeal_products(timedeal_id, sort_order);

-- updated_at 자동 업데이트 트리거 함수 (이미 있다면 스킵)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_timedeals_updated_at BEFORE UPDATE ON timedeals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 정책 설정 (필요한 경우)
ALTER TABLE timedeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE timedeal_products ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (모든 사용자가 타임딜 조회 가능)
CREATE POLICY "타임딜 공개 읽기" ON timedeals
  FOR SELECT USING (true);

CREATE POLICY "타임딜 상품 공개 읽기" ON timedeal_products
  FOR SELECT USING (true);

