-- 첫구매 쿠폰 자동 발급 Trigger
-- users 테이블에 INSERT가 발생하면 자동으로 첫구매 쿠폰을 발급

-- 1. Trigger 함수 생성
CREATE OR REPLACE FUNCTION issue_first_purchase_coupon()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- RLS 우회를 위해 필요
AS $$
DECLARE
  v_coupon_id UUID;
  v_validity_days INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_has_received BOOLEAN;
BEGIN
  -- 활성화된 첫구매 쿠폰 조회 (가장 최근 것)
  SELECT id, validity_days INTO v_coupon_id, v_validity_days
  FROM coupons
  WHERE is_first_purchase_only = true
    AND is_active = true
    AND is_deleted = false
  ORDER BY created_at DESC
  LIMIT 1;

  -- 첫구매 쿠폰이 없으면 종료
  IF v_coupon_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 중복 발급 방지: is_first_purchase_only=true인 쿠폰을 한 번이라도 받은 적이 있는지 확인
  -- (UNIQUE 제약조건과 함께 이중 방어 역할)
  SELECT EXISTS(
    SELECT 1
    FROM user_coupons uc
    INNER JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = NEW.id
      AND c.is_first_purchase_only = true
      AND c.is_deleted = false
  ) INTO v_has_received;

  -- 이미 받은 적이 있으면 종료 (평생 1번만 지급 정책)
  IF v_has_received THEN
    RETURN NEW;
  END IF;

  -- expires_at 계산 (현재 시간 + validity_days)
  v_expires_at := NOW() + (v_validity_days || ' days')::INTERVAL;

  -- 쿠폰 지급 (UNIQUE 제약조건 충돌 시 DO NOTHING으로 race condition 완전 방지)
  INSERT INTO user_coupons (user_id, coupon_id, is_used, expires_at)
  VALUES (NEW.id, v_coupon_id, false, v_expires_at)
  ON CONFLICT (user_id, coupon_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. 기존 Trigger 삭제 (있다면)
DROP TRIGGER IF EXISTS trigger_issue_first_purchase_coupon ON public.users;

-- 3. Trigger 생성 (users 테이블 INSERT 후 실행)
CREATE TRIGGER trigger_issue_first_purchase_coupon
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION issue_first_purchase_coupon();

-- 4. 코멘트 추가
COMMENT ON FUNCTION issue_first_purchase_coupon() IS '회원가입 시 첫구매 쿠폰을 자동으로 발급하는 Trigger 함수. is_first_purchase_only=true인 쿠폰을 평생 1번만 지급합니다.';

