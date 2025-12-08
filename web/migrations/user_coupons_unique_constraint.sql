-- user_coupons 테이블에 UNIQUE 제약조건 추가
-- 같은 쿠폰은 평생 1번만 받을 수 있도록 DB 레벨에서 강제

-- 1. 기존 중복 데이터 확인 (선택적 - 실행 전 확인용)
-- SELECT user_id, coupon_id, COUNT(*) as count
-- FROM user_coupons
-- GROUP BY user_id, coupon_id
-- HAVING COUNT(*) > 1;

-- 2. 기존 제약조건 삭제 (있다면)
ALTER TABLE public.user_coupons
DROP CONSTRAINT IF EXISTS unique_user_coupon;

-- 3. UNIQUE 제약조건 추가
-- 같은 사용자가 같은 쿠폰을 중복으로 받을 수 없도록 제약
ALTER TABLE public.user_coupons
ADD CONSTRAINT unique_user_coupon UNIQUE (user_id, coupon_id);

-- 4. 코멘트 추가
COMMENT ON CONSTRAINT unique_user_coupon ON public.user_coupons IS 
'같은 사용자가 같은 쿠폰을 중복으로 받을 수 없도록 하는 제약조건. 평생 1번만 받을 수 있는 정책을 DB 레벨에서 강제합니다.';

