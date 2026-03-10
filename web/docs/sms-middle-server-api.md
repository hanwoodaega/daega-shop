# 중간 서버 제공 API 정리 (SMS / 알림톡)

쇼핑몰(Next.js)은 고정 IP가 필요한 알리고를 직접 호출하지 않고, **중간 서버**를 통해 SMS/알림톡을 발송합니다.  
중간 서버는 아래 API를 제공해야 합니다.

---

## 공통 사항

| 항목 | 내용 |
|------|------|
| **Base URL** | 쇼핑몰 env `SMS_SERVICE_URL` (끝 `/` 제거 후 사용) |
| **인증** | `Authorization: Bearer {SMS_SERVICE_TOKEN}` |
| **요청** | `Content-Type: application/json`, **POST** |
| **응답** | JSON. 성공 시 `2xx`, 실패 시 `4xx/5xx` + body에 `error` 또는 `message` (문자열) 권장 |

쇼핑몰은 `res.ok`(2xx 여부)로만 성공/실패를 판단하고, 실패 시 응답 body의 `error` 또는 `message`를 로그에 사용합니다.

---

## 1. 주문 완료 알림톡

**POST** `/alimtalk/send-order-complete`

비회원 주문 완료 시 발송. 실패 시 대체 문자 발송은 중간 서버(알리고)에서 처리.

### Request Body

| 필드 | 타입 | 설명 |
|------|------|------|
| `to` | string | 수신 휴대폰 번호 (숫자만 10~11자리) |
| `order_number` | string | 주문번호 |
| `product_name` | string | 대표 상품명 (예: "한우 등심 200g 외 2개") |

### 예시

```json
{
  "to": "01012345678",
  "order_number": "ORD-20250308-001",
  "product_name": "한우 등심 200g 외 2개"
}
```

---

## 2. 선물받기 알림톡

**POST** `/alimtalk/send-gift`

선물 결제 완료 후, 받는 사람 휴대폰으로 발송. 실패 시 대체 문자는 중간 서버에서 처리.

### Request Body

| 필드 | 타입 | 설명 |
|------|------|------|
| `to` | string | 수신 휴대폰 번호 (숫자만 10~11자리) |
| `recipient_name` | string | 받는 사람 이름 (비어 있으면 "고객" 등 처리) |
| `sender_name` | string | 보낸 사람 이름 |
| `message` | string | 선물 메시지 (없으면 `""`) |
| `product_name` | string | 대표 상품명 |
| `token` | string | 선물 수신 페이지용 토큰 |
| `expires_at` | string | 유효기간 표시용 (예: "3월 15일") |

### 알림톡 템플릿 변수 매핑

| 템플릿 변수 | Request 필드 |
|-------------|----------------|
| #{받는사람} | `recipient_name` (없으면 "고객" 등) |
| #{보낸사람} | `sender_name` |
| #{상품명} | `product_name` |
| #{메시지} | `message` |
| #{유효기간} | `expires_at` |

### 템플릿 문구 (참고)

```
[대가정육마트]
#{받는사람}님, #{보낸사람}님이 선물을 보냈어요!

상품 : #{상품명}

메시지
"#{메시지}"

선물을 확인하고 배송받을 주소를 입력해주세요.
※ 선물 기한 : #{유효기간}까지
```

### 예시

```json
{
  "to": "01098765432",
  "recipient_name": "",
  "sender_name": "홍길동",
  "message": "생일 축하해요!",
  "product_name": "한우 등심 200g",
  "token": "abc123def456",
  "expires_at": "3월 15일"
}
```

---

## 3. OTP/인증번호 SMS

**POST** `/sms/send-otp`

회원가입, 아이디 찾기, 비밀번호 찾기, 전화번호 인증, **주문조회 OTP** 등 모든 인증번호 발송에 사용.  
쇼핑몰에서 이미 문구를 만들어 `text`로 넘깁니다.

### Request Body

| 필드 | 타입 | 설명 |
|------|------|------|
| `to` | string | 수신 휴대폰 번호 (숫자만 10~11자리) |
| `text` | string | 발송할 문자 내용 (인증번호 문구 포함) |

### 예시

```json
{
  "to": "01012345678",
  "text": "[대가정육마트] 인증번호 [123456]입니다. 5분 내 입력해주세요."
}
```

---

## 4. 일반 SMS

**POST** `/sms/send`

OTP가 아닌 일반 문자 (예: 아이디 찾기 결과 안내).

### Request Body

| 필드 | 타입 | 설명 |
|------|------|------|
| `to` | string | 수신 휴대폰 번호 (숫자만 10~11자리) |
| `text` | string | 발송할 문자 내용 |

### 예시

```json
{
  "to": "01012345678",
  "text": "[대가정육마트] 아이디 찾기 결과: 회원님의 아이디는 user@example.com 입니다."
}
```

---

## 요약 테이블

| 메서드 | 경로 | 용도 |
|--------|------|------|
| POST | `/alimtalk/send-order-complete` | 주문 완료 알림톡 |
| POST | `/alimtalk/send-gift` | 선물받기 알림톡 |
| POST | `/sms/send-otp` | OTP/인증번호 SMS |
| POST | `/sms/send` | 일반 SMS |

쇼핑몰 호출 코드: `web/lib/notifications/` (aligo-core.ts, send-alimtalk.ts, send-sms.ts)
