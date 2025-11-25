# 선물하기 시스템 정리

## 📋 개요

선물하기 기능은 구매자가 상품을 선물로 주문하고, 수령자가 링크를 통해 배송 정보를 입력하여 수령하는 시스템입니다.

## 🗂️ 파일 구조

### 프론트엔드
- `app/gift/page.tsx` - 선물하기 메인 페이지
- `app/gift/guide/page.tsx` - 선물하기 사용 가이드
- `app/gift/receive/[token]/page.tsx` - 선물 수령 페이지
- `app/gift/receive/[token]/success/page.tsx` - 선물 수령 성공 페이지

### API
- `app/api/gift/[token]/route.ts` - 선물 토큰 조회 및 수령 처리
- `app/api/gift/create-pending/route.ts` - 선물 주문 생성 (결제 전)
- `app/api/gift/upload-card-image/route.ts` - 선물 카드 이미지 업로드

### 주문 생성 연동
- `app/api/orders/route.ts` - 일반 주문 생성 시 선물 옵션 처리

## 🔄 플로우

### 1. 선물 주문 생성

#### 체크아웃 페이지에서 선물하기 선택
- `is_gift: true` 설정
- `gift_message`: 선물 메시지
- `gift_card_design`: 선물 카드 디자인

#### 주문 생성 API (`/api/orders`)
```typescript
// 선물 주문인 경우
if (isGift && order) {
  const giftToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 5) // 5일 후 만료
  
  // orders 테이블 업데이트
  - gift_token: 토큰 생성
  - is_gift: true
  - gift_message: 메시지
  - gift_card_design: 카드 디자인
  - gift_expires_at: 만료일 (5일 후)
  - gift_status: 'pending' (기본값)
  - shipping_address: '선물 수령 대기'
}
```

### 2. 선물 링크 전송

구매자가 선물 링크를 수령자에게 전송:
- 링크 형식: `/gift/receive/[token]`
- 카카오톡 등으로 전송 (구현 필요)

### 3. 선물 수령 페이지 (`/gift/receive/[token]`)

#### 상태별 화면 분기

**1. `gift_status === 'expired'` 또는 만료일 지남**
```
이 선물은 유효기간이 만료되었습니다.
5일 이내에 수령이 완료되지 않아 주문이 자동으로 취소되었어요.
궁금한 점이 있으시면 고객센터로 문의해주세요.
```

**2. `gift_status === 'used'`**
```
이미 배송 정보가 입력되었습니다.
```

**3. `gift_status === 'pending'` 또는 null**
- 선물 카드 표시
- 선물 정보 표시
- 배송 정보 입력 폼
- 하단 고정 버튼: "선물 수령하기"

#### 선물 수령 처리

**API: POST `/api/gift/[token]`**
```typescript
// 배송 정보 입력 후
- shipping_name: 받는 분 이름
- shipping_phone: 연락처
- shipping_address: 주소
- delivery_note: 배송 요청사항
- status: 'paid' (결제 완료)
- gift_status: 'used' (수령 완료)
```

**성공 시**
- `/gift/receive/[token]/success` 페이지로 이동
- "배송 정보가 정상적으로 접수되었습니다" 메시지

## 📊 데이터베이스 스키마

### orders 테이블 컬럼

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `is_gift` | boolean | 선물 주문 여부 |
| `gift_token` | string | 선물 토큰 (32바이트 hex) |
| `gift_message` | string | 선물 메시지 |
| `gift_card_design` | string | 선물 카드 디자인 ID |
| `gift_expires_at` | timestamp | 선물 만료일 (5일 후) |
| `gift_status` | string | 선물 상태: 'pending' \| 'used' \| 'expired' |
| `shipping_address` | string | '선물 수령 대기' (초기값) |

### gift_status 상태

- **pending**: 선물 대기 중 (기본값)
- **used**: 선물 수령 완료 (배송 정보 입력됨)
- **expired**: 만료됨 (5일 경과)

## ⏰ 만료 처리

### 만료 조건
- `gift_expires_at`이 현재 시간보다 이전
- 또는 `gift_status === 'expired'`

### 만료 시 처리 (크론잡 필요)
```typescript
// 매일 자정 실행 예정
1. gift_expires_at이 5일 지난 주문 조회
2. gift_status를 'expired'로 업데이트
3. 주문 상태를 'cancelled'로 변경
4. 환불 처리 (포인트 복구, 쿠폰 복구)
5. 구매자에게 알림톡 전송
```

## 🔐 API 엔드포인트

### GET `/api/gift/[token]`
선물 토큰으로 주문 정보 조회

**응답:**
```json
{
  "order": {
    "id": "...",
    "gift_message": "...",
    "gift_card_design": "...",
    "gift_status": "pending",
    "order_items": [...],
    "users": { "name": "...", "email": "..." }
  },
  "expires_at": "2024-01-01T00:00:00Z"
}
```

**에러:**
- 404: 유효하지 않은 토큰
- 400: 이미 수령된 선물
- 410: 만료된 선물

### POST `/api/gift/[token]`
선물 수령 처리 (배송 정보 입력)

**요청:**
```json
{
  "recipient_name": "홍길동",
  "recipient_phone": "01012345678",
  "zipcode": "12345",
  "address": "서울시 강남구",
  "address_detail": "101동 101호",
  "delivery_note": "문 앞에 놓아주세요"
}
```

**응답:**
```json
{
  "success": true,
  "message": "선물 수령 정보가 등록되었습니다.",
  "order": {...}
}
```

## 🎨 UI 컴포넌트

### 선물 수령 페이지 구성
1. **상단 고정 메시지**: "{보낸 사람}님이 선물을 보냈어요!"
2. **선물 카드**: 디자인 이미지 + 메시지 오버레이
3. **선물 정보**: 상품 이미지, 이름, 수량
4. **배송 정보 입력 폼** (pending 상태일 때만)
5. **하단 고정 버튼**: "선물 수령하기" (pending 상태일 때만)

## 📝 TODO / 개선 사항

### 구현 필요
- [ ] 만료 처리 크론잡 (`/api/cron/expire-gifts`)
- [ ] 구매자에게 알림톡 전송 기능
- [ ] 카카오톡 선물 링크 전송 기능
- [ ] 선물 카드 디자인 관리 페이지

### 개선 가능
- [ ] 선물 거절 기능 (현재 제거됨)
- [ ] 선물 상태 변경 이력 추적
- [ ] 만료 전 알림 기능

## 🔍 주요 로직

### 만료 체크
```typescript
// API에서 만료 체크
if (expiresAt && expiresAt < new Date()) {
  // 만료 처리
  await supabaseAdmin
    .from('orders')
    .update({ 
      status: 'cancelled',
      shipping_address: '만료로 인한 자동 취소',
      gift_status: 'expired'
    })
    .eq('id', order.id)
}
```

### 상태별 화면 분기
```typescript
// 프론트엔드
if (order.gift_status === 'expired' || isExpired) {
  // 만료 안내 화면
} else if (order.gift_status === 'used') {
  // 이미 수령 완료 메시지
} else if (order.gift_status === 'pending' || !order.gift_status) {
  // 배송 정보 입력 폼
}
```

## 📌 참고사항

- 선물 유효기간: **5일**
- 선물 토큰: 32바이트 랜덤 hex 문자열
- 선물 수령 시 `gift_status`를 'used'로 변경
- 만료 시 자동 취소 및 환불 처리



