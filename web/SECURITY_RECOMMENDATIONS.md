# 카드 정보 보안 권장사항

## 현재 보안 상태

### ✅ 잘 되어 있는 부분
1. **카드 번호 마스킹**: 마지막 4자리만 저장 (`****-****-****-1234`)
2. **CVV 미저장**: 폼에서만 입력받고 DB에 저장하지 않음
3. **RLS 정책**: 사용자는 자신의 카드만 접근 가능
4. **HTTPS**: Supabase는 기본적으로 HTTPS 사용

### ⚠️ 개선이 필요한 부분
1. **만료일 평문 저장**: `expiry_month`, `expiry_year`가 평문으로 저장됨
2. **카드 소유자 이름 평문 저장**: `card_holder`가 평문으로 저장됨
3. **암호화 없음**: 민감 정보가 암호화되지 않음

## 권장 개선 방안

### 1. 실제 결제 시 PG사 토큰화 사용 (가장 중요!)

**현재는 "간편 결제 관리" 기능으로 실제 결제는 하지 않습니다.**
**실제 결제를 구현할 때는 반드시 PG사의 토큰화 기능을 사용해야 합니다.**

#### 토스페이먼츠 예시:
```typescript
// 카드 정보를 직접 저장하지 않고, 토스페이먼츠 빌링키만 저장
const billingKey = await tossPayments.requestBillingKey({
  customerKey: userId,
  successUrl: `${origin}/payment/success`,
  failUrl: `${origin}/payment/fail`,
})

// DB에는 빌링키만 저장
await supabase.from('payment_cards').insert({
  user_id: userId,
  billing_key: billingKey, // PG사에서 발급한 토큰
  card_last4: last4, // 표시용 마지막 4자리
  is_default: true,
})
```

#### 장점:
- ✅ PCI DSS 준수 (카드 정보를 직접 저장하지 않음)
- ✅ 법적 책임 최소화
- ✅ 보안 인증 불필요 (PG사가 처리)

### 2. 애플리케이션 레벨 암호화 (현재 구조 유지 시)

만약 현재 구조를 유지하면서 보안을 강화하려면:

```typescript
// lib/encryption.ts
import crypto from 'crypto'

const algorithm = 'aes-256-gcm'
const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex') // 32바이트 키

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

### 3. 민감 정보 최소화 (간단한 방법)

```sql
-- 만료일은 연도만 저장
ALTER TABLE payment_cards DROP COLUMN expiry_month;
ALTER TABLE payment_cards ADD COLUMN expiry_year TEXT; -- 연도만 저장

-- 카드 소유자 이름은 이니셜만 저장
ALTER TABLE payment_cards ALTER COLUMN card_holder TYPE TEXT; -- 이니셜만 저장
```

## 결론

**현재 상태**: "간편 결제 관리" 기능으로는 현재 보안 수준으로도 충분합니다.

**실제 결제 구현 시**: 반드시 PG사 토큰화 기능을 사용해야 합니다.
- 카드 정보를 직접 저장하지 않음
- PG사에서 발급한 빌링키/토큰만 저장
- PCI DSS 준수

## 참고 자료

- [PCI DSS 규정](https://www.pcisecuritystandards.org/)
- [토스페이먼츠 빌링키 가이드](https://docs.tosspayments.com/guides/vault)
- [Supabase 보안 가이드](https://supabase.com/docs/guides/platform/security)

