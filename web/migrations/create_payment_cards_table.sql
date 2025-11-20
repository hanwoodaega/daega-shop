-- payment_cards 테이블 생성
CREATE TABLE IF NOT EXISTS public.payment_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL,
  card_holder TEXT NOT NULL,
  expiry_month TEXT NOT NULL,
  expiry_year TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payment_cards_user_id ON public.payment_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_cards_is_default ON public.payment_cards(user_id, is_default) WHERE is_default = true;

-- RLS (Row Level Security) 활성화
ALTER TABLE public.payment_cards ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 카드만 조회 가능
CREATE POLICY "Users can view their own payment cards"
  ON public.payment_cards
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 카드만 삽입 가능
CREATE POLICY "Users can insert their own payment cards"
  ON public.payment_cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 카드만 수정 가능
CREATE POLICY "Users can update their own payment cards"
  ON public.payment_cards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 카드만 삭제 가능
CREATE POLICY "Users can delete their own payment cards"
  ON public.payment_cards
  FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_payment_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_payment_cards_updated_at
  BEFORE UPDATE ON public.payment_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_cards_updated_at();

