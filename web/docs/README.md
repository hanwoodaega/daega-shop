# 배송 상태 시스템 문서

## 현재 구현 (STEP 1) ✅

단순화된 배송 상태 시스템이 구현되어 있습니다.

### 주문 상태
- **주문 접수됨** (ORDER_RECEIVED)
- **상품 준비중** (PREPARING)
- **배송중** (IN_TRANSIT)
- **배송완료** (DELIVERED)

### 주요 기능
1. 관리자가 송장번호 입력 시 자동으로 배송중 상태로 변경
2. 사용자가 배송조회 버튼 클릭 시 택배사 배송조회 링크 열기
3. 지원 택배사: CJ대한통운, 롯데택배, 한진택배, 로젠택배, 우체국택배, 쿠팡

## 미래 구현 (STEP 2) 📋

나중에 물량이 많아지면 다음을 구현할 예정:
- 택배사 테스트 API 요청
- 자동화 API 연동
- 배송 자동업데이트 Worker 추가

자세한 내용은 `docs/FUTURE_AUTOMATION.md` 참고

## 마이그레이션

데이터베이스 마이그레이션은 `migrations/add_tracking_fields_and_new_statuses.sql` 파일을 실행하세요.




