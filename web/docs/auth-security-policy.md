# 인증/보안 정책 요약

## 탈퇴/복구 정책
- 탈퇴 시 `users.status = 'deleted'`로 전환합니다.
- 복구는 휴대폰 OTP 인증 성공 후에만 `active`로 복귀합니다.
- 탈퇴 상태에서는 로그인 보호 API가 403으로 차단됩니다.
- 복구 시점은 `users.restored_at`에 기록합니다.

## 개인정보 처리
- 탈퇴 시 `name`은 `null` 처리합니다.
- `phone`은 유지하고 `phone_verified_at`만 `null` 처리합니다.
- 안내 문구로 "탈퇴 = 재인증 후 복구 가능" 정책을 명확히 고지합니다.

## 세션 처리
- 탈퇴 처리 후 refresh token을 무효화합니다.
