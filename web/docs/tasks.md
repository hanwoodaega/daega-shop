# 작업 TODO 리스트

## 인증번호 발송 시스템

### 카카오 알림톡 + SMS Fallback 구현
- [ ] 카카오 비즈니스 메시지 API 실제 연동
  - 카카오 개발자 콘솔에서 비즈니스 메시지 앱 등록
  - 알림톡 템플릿 생성 및 승인
  - 환경 변수 설정:
    - `KAKAO_BIZ_API_KEY`
    - `KAKAO_ALIMTALK_TEMPLATE_ID`
    - `KAKAO_PLUS_FRIEND_ID` (선택)

- [ ] SMS API 실제 연동
  - SMS 발송 서비스 선택 (알리고, 카카오톡 비즈니스 메시지 등)
  - 환경 변수 설정:
    - `SMS_API_KEY`
    - `SMS_USER_ID` (필요시)

- [ ] 인증번호 저장/검증 시스템 구현
  - 현재는 임시 구현 상태
  - Redis 또는 데이터베이스로 전환 필요
  - 인증번호 만료 시간 관리 (5분)
  - 인증번호 재발송 제한 (1분 내 재발송 방지)

### 인증번호 발송 API 개선
- [ ] `web/app/api/auth/send-verification-code/route.ts`
  - Redis/DB 연동
  - 인증번호 저장 로직
  - 재발송 제한 로직

### 인증번호 검증 API 개선
- [ ] `web/app/api/auth/verify-code/route.ts`
  - Redis/DB에서 인증번호 확인
  - 만료 시간 체크
  - 인증 완료 후 인증번호 삭제


## 기타 개선 사항

### 성능 최적화
- [ ] 인증번호 발송 비동기 처리
- [ ] 인증번호 발송 실패 시 재시도 로직

### 보안 강화
- [ ] 인증번호 발송 횟수 제한 (일일 제한)
- [ ] IP 기반 발송 제한
- [ ] 인증번호 형식 검증 강화

### 사용자 경험 개선
- [ ] 인증번호 발송 성공/실패 알림 메시지 개선
- [ ] 인증번호 입력 시 자동 포맷팅
- [ ] 인증번호 재발송 타이머 표시

---

## 참고 사항

### 카카오 알림톡 API 문서
- 카카오 비즈니스 메시지 API: https://developers.kakao.com/docs/latest/ko/business-message/rest-api

### SMS API 서비스
- 알리고: https://www.aligo.in/
- 카카오톡 비즈니스 메시지: https://developers.kakao.com/docs/latest/ko/business-message/rest-api

### Redis 설정 (선택)
- 인증번호 저장을 위한 Redis 서버 설정
- 또는 Supabase의 실시간 기능 활용

