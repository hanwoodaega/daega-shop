-- coupons 테이블에 is_deleted 컬럼 추가 (soft delete 지원)
-- 쿠폰 삭제 시 물리 삭제 대신 is_deleted=true로 처리하여 데이터 무결성 보장

ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL;

-- 기존 데이터는 모두 is_deleted=false로 설정
UPDATE public.coupons
SET is_deleted = false
WHERE is_deleted IS NULL;

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_coupons_is_deleted_is_active
ON public.coupons (is_deleted, is_active);

-- 코멘트 추가
COMMENT ON COLUMN public.coupons.is_deleted IS '쿠폰 삭제 여부 (soft delete). true이면 삭제된 쿠폰으로 간주하며 일반 조회에서 제외됨.';

