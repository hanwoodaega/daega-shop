-- ==========================================
-- addresses 테이블에 배송 요청사항 컬럼 추가
-- ==========================================
--
-- 사용법:
-- Supabase SQL Editor에서 실행
-- ==========================================

-- delivery_note 컬럼 추가 (기존 addresses 테이블이 있는 경우)
ALTER TABLE addresses 
ADD COLUMN IF NOT EXISTS delivery_note TEXT DEFAULT NULL;

-- ✅ 완료! 이제 배송지에 요청사항을 저장할 수 있습니다.

-- 예시:
-- - "공동현관 비밀번호 #1234"
-- - "문 앞에 놓아주세요"
-- - "부재 시 경비실에 맡겨주세요"
-- - "배송 전 연락 부탁드립니다"

-- 확인 쿼리:
-- SELECT id, name, address, delivery_note FROM addresses WHERE delivery_note IS NOT NULL;


