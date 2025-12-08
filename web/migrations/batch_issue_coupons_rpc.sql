-- batch_issue_coupons RPC 함수 생성/수정
-- expires_at을 서버에서 계산하여 저장하도록 수정
-- 반환 타입 변경을 위해 기존 함수 삭제 후 재생성

DROP FUNCTION IF EXISTS batch_issue_coupons(uuid, uuid[]);

CREATE OR REPLACE FUNCTION batch_issue_coupons(
  p_coupon_id UUID,
  p_user_ids UUID[]
)
RETURNS TABLE(inserted_count INTEGER, skipped_count INTEGER, inserted_user_ids UUID[])
LANGUAGE plpgsql
AS $$
DECLARE
  v_validity_days INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_inserted INTEGER := 0;
  v_total INTEGER := 0;
  v_inserted_user_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- 총 건수
  v_total := array_length(p_user_ids, 1);

  -- 쿠폰 정보 조회
  SELECT validity_days INTO v_validity_days
  FROM coupons
  WHERE id = p_coupon_id;

  IF v_validity_days IS NULL THEN
    RAISE EXCEPTION '쿠폰을 찾을 수 없습니다: %', p_coupon_id;
  END IF;

  -- 하나의 expires_at 값 생성
  v_expires_at := NOW() + (v_validity_days || ' days')::INTERVAL;

  /*
    정책:
      - 같은 쿠폰은 평생 딱 한번만 받을 수 있음
      - 사용 여부와 관계없이 한 번 받은 적이 있으면 재발급 금지
  */

  WITH target_users AS (
      SELECT uid
      FROM unnest(p_user_ids) AS uid
      WHERE NOT EXISTS (
        SELECT 1 FROM user_coupons
        WHERE user_id = uid
          AND coupon_id = p_coupon_id
        -- 사용 여부와 관계없이 한 번 받은 적이 있으면 재발급 금지
      )
  ),
  inserted AS (
    INSERT INTO user_coupons (user_id, coupon_id, is_used, expires_at)
    SELECT 
      uid, p_coupon_id, false, v_expires_at
    FROM target_users
    RETURNING user_id
  )
  SELECT 
    COUNT(*),
    array_agg(user_id)
  INTO 
    v_inserted,
    v_inserted_user_ids
  FROM inserted;

  RETURN QUERY SELECT v_inserted, (v_total - v_inserted), COALESCE(v_inserted_user_ids, ARRAY[]::UUID[]);
END;
$$;

