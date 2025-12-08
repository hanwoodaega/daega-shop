-- coupons 테이블 RLS 정책 설정
-- 모든 사용자가 활성 쿠폰을 조회할 수 있도록 설정
-- 관리자는 service_role 키를 사용하여 RLS를 우회 (코드에서 처리)

-- 1. RLS 활성화
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- 3. SELECT 정책: 모든 사용자가 활성이고 삭제되지 않은 쿠폰 조회 가능
-- (user_coupons JOIN 시 쿠폰 정보를 조회하기 위해 필요)
-- 주의: 관리자 작업(INSERT/UPDATE/DELETE)은 service_role 키로 RLS 우회
CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
USING (is_active = true AND is_deleted = false);

-- 4. user_coupons 테이블 RLS 정책 설정 (이미 있다면 무시됨)
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their coupons" ON public.user_coupons;
DROP POLICY IF EXISTS "Users can use their coupons" ON public.user_coupons;

-- 5. SELECT 정책: 사용자는 자신의 쿠폰만 조회 가능
CREATE POLICY "Users can view their coupons"
ON public.user_coupons
FOR SELECT
USING (auth.uid() = user_id);

-- 6. UPDATE 정책: 사용자는 자신의 쿠폰만 사용 가능 (is_used 업데이트)
CREATE POLICY "Users can use their coupons"
ON public.user_coupons
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

