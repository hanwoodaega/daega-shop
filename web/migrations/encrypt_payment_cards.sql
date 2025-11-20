-- payment_cards 테이블에 암호화 컬럼 추가 및 기존 데이터 마이그레이션
-- 주의: 이 마이그레이션은 Supabase의 pgcrypto 확장을 사용합니다.

-- pgcrypto 확장 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 암호화 키는 환경 변수나 Supabase Vault에서 관리해야 합니다.
-- 여기서는 예시로 보여주기만 합니다.
-- 실제 운영 환경에서는 Supabase Vault를 사용하거나 애플리케이션 레벨에서 암호화하는 것을 권장합니다.

-- 참고: Supabase에서는 컬럼 레벨 암호화보다는 애플리케이션 레벨 암호화를 권장합니다.
-- 이유: 
-- 1. 키 관리가 더 안전함
-- 2. 성능이 더 좋음
-- 3. 유연성이 높음

-- 대안 1: 애플리케이션 레벨 암호화 (권장)
-- Node.js에서 crypto 모듈을 사용하여 암호화/복호화
-- 예시:
-- const crypto = require('crypto');
-- const algorithm = 'aes-256-gcm';
-- const key = process.env.ENCRYPTION_KEY; // 32바이트 키
-- 
-- function encrypt(text) {
--   const iv = crypto.randomBytes(16);
--   const cipher = crypto.createCipheriv(algorithm, key, iv);
--   let encrypted = cipher.update(text, 'utf8', 'hex');
--   encrypted += cipher.final('hex');
--   const authTag = cipher.getAuthTag();
--   return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
-- }

-- 대안 2: Supabase Vault 사용 (프리미엄 기능)
-- Supabase Vault는 암호화된 키 저장소를 제공합니다.

-- 현재는 마스킹된 카드 번호만 저장하므로 상대적으로 안전하지만,
-- 만료일과 카드 소유자 이름은 암호화하는 것을 권장합니다.

-- 임시 해결책: 민감 정보 최소화
-- 1. 만료일은 연도만 저장 (월은 제거)
-- 2. 카드 소유자 이름은 이니셜만 저장
-- 3. 또는 완전히 제거하고 PG사 토큰만 사용

-- 실제 결제 시에는 PG사(토스페이먼츠, 네이버페이 등)의 토큰화 기능을 사용해야 합니다.
-- 카드 정보를 직접 저장하지 않고, PG사에서 발급한 토큰만 저장합니다.

-- 예시: 토스페이먼츠 빌링키 사용
-- ALTER TABLE payment_cards ADD COLUMN billing_key TEXT; -- PG사에서 발급한 빌링키
-- ALTER TABLE payment_cards DROP COLUMN card_number; -- 실제 카드 번호는 저장하지 않음
-- ALTER TABLE payment_cards DROP COLUMN expiry_month;
-- ALTER TABLE payment_cards DROP COLUMN expiry_year;
-- ALTER TABLE payment_cards DROP COLUMN card_holder;

