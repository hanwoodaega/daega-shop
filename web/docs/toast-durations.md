# 토스트(알림) 자동 제거 시간 정리

사라지지 않는 문제 방지를 위해 모든 토스트에 **명시적 duration**을 넣었습니다.

## 전역 기본값 (app/layout.tsx Toaster)

| 구분 | duration | 비고 |
|------|----------|------|
| 기본 | **2초** (2000ms) | 옵션 없이 호출 시 |
| success | **1.5초** (1500ms) | |
| error | **2초** (2000ms) | |

## 공통 유틸 (lib/utils/error-handler.ts)

| 함수 / 호출 | duration |
|-------------|----------|
| `showError()` | 2초 (옵션으로 변경 가능) |
| `showSuccess()` | 2초 |
| `showInfo()` | 2초 |
| `showCartAddedToast()` | **1.5초** |
| `showSuccessMessage()` (deprecated) | 2초 |
| `showInfoMessage()` (deprecated) | 2초 |
| `handleApiError()` 개발/프로덕션 | 2초 |

상수: `TOAST_DURATION = { success: 2000, error: 3000, info: 2000, cartAdded: 1500 }`

## 개별 화면에서 지정한 값

- **success 토스트**: **2초** (2000ms)
- **error 토스트**: **3초** (3000ms)
- **예외** (주문 취소 안내, 선물 링크 복사 실패, 자동 구매확정, 포인트 적립 등): **3초** (3000ms)
