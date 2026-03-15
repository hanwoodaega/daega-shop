# order_drafts.confirm_status 상태값

draft는 "승인은 끝났지만 후처리가 안 끝난 주문"의 원장 역할을 한다.

| 값 | 의미 |
|----|------|
| `null` | 결제 전 (pending). 만료 시 cleanup-drafts에서만 삭제 대상. |
| `approved_not_persisted` | 토스 승인 완료, orders 미생성. worker/cron 처리 대상. |
| `persisting` | worker가 주문 생성 중. |
| `done` | 주문 생성·후처리 완료. 삭제하지 않고 상태만 변경. |
| `failed` | 후처리 실패. 복구 후 재시도 가능. |

- **복구 목록**: `approved_not_persisted` 와 `failed` 가 결제 복구 페이지에 노출되며, 재처리(주문 생성) 또는 결제 취소(환불) 가능.
- **삭제**: confirm 시 draft를 삭제하지 않고 `done`으로 변경. cleanup-drafts는 `confirm_status IS NULL` 이고 `expires_at < now()` 인 행만 삭제.
