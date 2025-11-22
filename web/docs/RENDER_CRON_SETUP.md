# Render Cron + Worker 설정 가이드

## 배송 상태 자동 업데이트 시스템

30분마다 송장번호가 있는 주문의 배송 상태를 자동으로 업데이트하는 시스템입니다.

## 아키텍처

```
[Render Cron] → 단순 트리거
      ↓
[Render Worker] → 배송 상태 업데이트 전체 실행
      ↓
[Supabase] 저장
```

## 설정 단계

### 1. Render Worker 서비스 생성

1. Render Dashboard에 로그인
2. **New +** 버튼 클릭 → **Background Worker** 선택
3. 다음 정보 입력:

#### 기본 설정
- **Name**: `tracking-status-worker` (또는 원하는 이름)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start` (또는 Next.js의 경우 `npm run start`)
- **Region**: Web Service와 동일한 리전 선택

#### 환경 변수 설정
Worker 서비스의 환경 변수에 다음을 추가:

```
# Supabase 설정 (Web Service와 동일)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker 인증 (선택사항)
WORKER_SECRET=your-worker-secret-key
```

### 2. Render Cron Job 생성

1. Render Dashboard에 로그인
2. **New +** 버튼 클릭 → **Cron Job** 선택
3. 다음 정보 입력:

#### 기본 설정
- **Name**: `배송 상태 업데이트 트리거` (또는 원하는 이름)
- **Schedule**: `*/30 * * * *` (30분마다 실행)
- **Command**: 
  ```bash
  curl -X GET "https://your-web-service.onrender.com/api/cron/update-tracking-status" \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```

#### 환경 변수 설정
Cron Job의 환경 변수에 다음을 추가:

```
CRON_SECRET=your-cron-secret-key
WORKER_SERVICE_URL=https://tracking-status-worker.onrender.com
```

### 3. Web Service 환경 변수 설정

Web Service (메인 앱)의 환경 변수에 다음을 추가:

```
# Cron 인증
CRON_SECRET=your-cron-secret-key

# Worker 서비스 URL (선택사항, 자동 감지도 가능)
WORKER_SERVICE_URL=https://tracking-status-worker.onrender.com

# Worker 인증 (선택사항)
WORKER_SECRET=your-worker-secret-key
```

### 4. Cron 표현식 설명

- `*/30 * * * *` - 30분마다 실행
- `0 */1 * * *` - 1시간마다 실행
- `0 9 * * *` - 매일 오전 9시 실행
- `*/15 * * * *` - 15분마다 실행

### 5. 테스트

#### Cron Trigger 테스트
```bash
curl -X GET "https://your-web-service.onrender.com/api/cron/update-tracking-status" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

성공 응답 예시:
```json
{
  "message": "Worker 작업이 트리거되었습니다.",
  "triggered": true,
  "workerResult": {
    "message": "0개 주문의 배송 상태가 업데이트되었습니다.",
    "updated": 0,
    "total": 0
  }
}
```

#### Worker 직접 테스트
```bash
curl -X POST "https://tracking-status-worker.onrender.com/api/worker/update-tracking-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WORKER_SECRET"
```

#### Worker 상태 확인
```bash
curl -X GET "https://tracking-status-worker.onrender.com/api/worker/update-tracking-status"
```

## 보안 고려사항

1. **CRON_SECRET 생성**: 강력한 랜덤 문자열 사용
   ```bash
   # Linux/Mac
   openssl rand -hex 32
   
   # 또는
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **WORKER_SECRET 생성**: Worker 서비스 간 인증용 (선택사항)
   ```bash
   openssl rand -hex 32
   ```

3. **환경 변수 보호**: 
   - `CRON_SECRET`, `WORKER_SECRET`은 절대 코드에 하드코딩하지 마세요
   - Render Dashboard의 환경 변수에서만 관리

4. **HTTPS 사용**: Render는 기본적으로 HTTPS를 제공합니다

5. **Worker 서비스 격리**: Worker는 독립적인 서비스로 실행되어 메인 앱에 영향을 주지 않습니다

## 문제 해결

### Cron Job이 실행되지 않는 경우

1. **로그 확인**: 
   - Render Dashboard → Cron Job → Logs
   - Render Dashboard → Web Service → Logs (Cron Trigger 로그)
2. **인증 확인**: `CRON_SECRET`이 올바르게 설정되었는지 확인
3. **URL 확인**: Web Service URL이 올바른지 확인
4. **Worker URL 확인**: `WORKER_SERVICE_URL`이 올바르게 설정되었는지 확인

### Worker가 응답하지 않는 경우

1. **Worker 서비스 상태 확인**: Render Dashboard → Worker Service → Status
2. **Worker 로그 확인**: Render Dashboard → Worker Service → Logs
3. **Worker 직접 테스트**: Worker 엔드포인트를 직접 호출하여 테스트
4. **타임아웃 확인**: Worker 작업이 너무 오래 걸리면 타임아웃이 발생할 수 있음

### 인증 오류가 발생하는 경우

- `CRON_SECRET` 환경 변수가 Web Service와 Cron Job 양쪽에 모두 설정되어 있는지 확인
- `WORKER_SECRET`이 설정된 경우, Worker 서비스에도 동일한 값이 설정되어 있는지 확인
- Authorization 헤더의 Bearer 토큰이 정확한지 확인

## 모니터링

Render Dashboard에서 다음을 확인할 수 있습니다:

### Cron Job
- **Last Run**: 마지막 실행 시간
- **Next Run**: 다음 실행 예정 시간
- **Logs**: 실행 로그 및 오류 메시지

### Worker Service
- **Status**: Worker 서비스 상태
- **Logs**: Worker 실행 로그 및 상세 작업 내역
- **Metrics**: CPU, 메모리 사용량

## 장점

1. **독립 실행**: Worker가 독립적으로 실행되어 메인 앱에 영향을 주지 않음
2. **타임아웃 걱정 없음**: Worker는 별도 서비스이므로 긴 작업도 안전하게 실행 가능
3. **확장성**: Worker 서비스를 별도로 스케일링 가능
4. **모니터링**: Worker와 Cron을 별도로 모니터링 가능

## 참고

- Render Cron과 Worker는 무료 플랜에서도 사용 가능합니다
- Cron Job은 최소 1분 간격으로 실행 가능합니다
- Worker 서비스는 항상 실행되므로 비용이 발생할 수 있습니다 (무료 플랜은 750시간/월)
- Worker 서비스는 필요할 때만 실행되도록 최적화할 수 있습니다

