# 알림 API 호출 방식 가이드

이 문서는 알림 관련 API의 호출 방식과 사용 패턴을 정리한 문서입니다.

## 📋 알림 API 목록

### 1. `GET /api/notifications` - 알림 목록 조회

**용도:** 사용자의 알림 목록을 조회합니다.

**인증:** 필요 (로그인한 사용자만)

**쿼리 파라미터:**
- `unread_only` (optional): `true`일 경우 읽지 않은 알림만 조회

**응답 형식:**
```typescript
{
  notifications: NotificationItem[]
}
```

**호출 위치:**
- `lib/notification/notification.service.ts` - `fetchNotifications()`
- `app/notifications/NotificationsPageClient.tsx` - `useNotifications` 훅을 통해 간접 호출

**사용 예시:**
```typescript
// 서비스 함수 사용
import { fetchNotifications } from '@/lib/notification/notification.service'

const notifications = await fetchNotifications()

// 또는 훅 사용
import { useNotifications } from '@/lib/notification/notification.hooks'

const { notifications, loading } = useNotifications({ userId: user?.id })
```

---

### 2. `GET /api/notifications/unread-count` - 읽지 않은 알림 개수 조회

**용도:** 헤더의 알림 벨에 표시할 읽지 않은 알림 개수를 조회합니다.

**인증:** 필요 (로그인한 사용자만, 비로그인 시 0 반환)

**응답 형식:**
```typescript
{
  count: number
}
```

**호출 위치:**
- `components/common/NotificationBell.tsx` - 직접 호출
- `lib/notification/notification.service.ts` - `fetchUnreadCount()` 함수

**호출 방식:**

#### 직접 호출 (NotificationBell 컴포넌트)

```typescript
// components/common/NotificationBell.tsx
const fetchUnreadCount = async () => {
  if (!user?.id) {
    setUnreadCount(0)
    return
  }

  try {
    const res = await fetch('/api/notifications/unread-count')
    
    if (!res.ok) {
      // 서버 에러는 조용히 처리
      return
    }
    
    const data = await res.json()
    
    if (typeof data.count === 'number') {
      setUnreadCount(data.count)
    }
  } catch (error) {
    // 네트워크 에러는 조용히 처리
  }
}

// 30초마다 폴링
useEffect(() => {
  if (!user?.id) {
    setUnreadCount(0)
    return
  }

  fetchUnreadCount()
  const interval = setInterval(fetchUnreadCount, 30000)

  return () => {
    clearInterval(interval)
  }
}, [user?.id])
```

#### 서비스 함수 사용

```typescript
// lib/notification/notification.service.ts
export async function fetchUnreadCount(): Promise<number> {
  const res = await fetch('/api/notifications/unread-count')
  const data = await res.json().catch(() => ({}))
  if (res.ok && typeof data.count === 'number') {
    return data.count
  }
  return 0
}
```

**특징:**
- **폴링:** 30초마다 자동으로 갱신
- **조건부 호출:** 로그인한 사용자만 호출
- **에러 처리:** 에러 발생 시 조용히 처리하고 기존 값 유지

---

### 3. `PATCH /api/notifications` - 알림 읽음 처리

**용도:** 알림을 읽음 처리합니다. 개별 알림 또는 전체 알림을 읽음 처리할 수 있습니다.

**인증:** 필요 (로그인한 사용자만)

**요청 본문:**

**전체 읽음 처리:**
```typescript
{
  mark_all_read: true
}
```

**개별 읽음 처리:**
```typescript
{
  notificationIds: string[]  // 알림 ID 배열
}
```

**응답 형식:**
```typescript
{
  success: true
}
```

**호출 위치:**
- `lib/notification/notification.service.ts` - `markAllNotificationsRead()`
- `app/notifications/NotificationsPageClient.tsx` - `useNotifications` 훅의 `markAllRead()` 함수를 통해 간접 호출

**사용 예시:**

#### 전체 읽음 처리

```typescript
// 서비스 함수 사용
import { markAllNotificationsRead } from '@/lib/notification/notification.service'

await markAllNotificationsRead()

// 또는 훅 사용
const { markAllRead } = useNotifications({ userId: user?.id })
markAllRead()  // 모든 알림을 읽음 처리
```

#### 개별 읽음 처리

```typescript
// 직접 호출
await fetch('/api/notifications', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notificationIds: ['notification-id-1', 'notification-id-2']
  }),
})
```

**특징:**
- **Fire-and-forget:** `keepalive: true` 옵션으로 페이지 이탈 시에도 요청 완료 보장
- **낙관적 업데이트:** UI는 즉시 업데이트하고 서버 요청은 백그라운드에서 처리

---

## 🔄 호출 패턴 및 흐름

### 1. 알림 벨 (NotificationBell)

**위치:** `components/common/NotificationBell.tsx`

**호출 흐름:**
```
컴포넌트 마운트
  ↓
useEffect 실행
  ↓
user?.id 확인
  ↓ (로그인한 경우)
fetchUnreadCount() 호출
  ↓
GET /api/notifications/unread-count
  ↓
응답 받아서 unreadCount 상태 업데이트
  ↓
30초마다 반복 (setInterval)
```

**특징:**
- 로그인하지 않은 사용자는 호출하지 않음
- 에러 발생 시 조용히 처리 (기존 값 유지)
- 컴포넌트 언마운트 시 interval 정리

---

### 2. 알림 페이지 (NotificationsPage)

**위치:** `app/notifications/NotificationsPageClient.tsx`

**호출 흐름:**
```
페이지 진입
  ↓
useNotifications 훅 실행
  ↓
userId 확인
  ↓ (userId가 있는 경우)
fetchNotifications() 호출
  ↓
GET /api/notifications
  ↓
응답 받아서 notifications 상태 업데이트
  ↓
페이지 이탈 시
  ↓
markAllRead() 자동 호출 (cleanup)
  ↓
PATCH /api/notifications (mark_all_read: true)
```

**특징:**
- 페이지 진입 시 알림 목록 자동 로드
- 페이지 이탈 시 읽지 않은 알림 자동 읽음 처리
- 탭별 필터링 (일반 알림 / 적립 알림)

---

## 📊 API 호출 시점 요약

| API | 호출 시점 | 호출 위치 | 폴링 여부 |
|-----|----------|----------|----------|
| `GET /api/notifications/unread-count` | 컴포넌트 마운트 시 | `NotificationBell` | ✅ 30초마다 |
| `GET /api/notifications` | 알림 페이지 진입 시 | `NotificationsPageClient` | ❌ |
| `PATCH /api/notifications` | 알림 읽음 처리 시 | `NotificationsPageClient` | ❌ |

---

## 🔒 인증 및 보안

### 인증 방식

모든 알림 API는 **Supabase Auth**를 사용하여 인증합니다:

```typescript
// 서버 사이드 인증
const supabase = createSupabaseServerClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 보안 특징

1. **HttpOnly 쿠키:** 세션 토큰이 JavaScript에서 접근 불가
2. **서버 사이드 검증:** 모든 요청은 서버에서 사용자 인증 확인
3. **사용자별 데이터 격리:** `user_id`로 필터링하여 본인 알림만 조회/수정 가능
4. **에러 처리:** 인증 실패 시 적절한 에러 응답 반환

---

## 💡 사용 패턴

### 패턴 1: 알림 벨에서 읽지 않은 개수 표시

```typescript
// components/common/NotificationBell.tsx
export default function NotificationBell() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0)
      return
    }

    const fetchUnreadCount = async () => {
      const res = await fetch('/api/notifications/unread-count')
      const data = await res.json()
      if (typeof data.count === 'number') {
        setUnreadCount(data.count)
      }
    }

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [user?.id])

  return (
    <button>
      {/* 알림 아이콘 */}
      {unreadCount > 0 && (
        <span>{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </button>
  )
}
```

### 패턴 2: 알림 페이지에서 알림 목록 조회

```typescript
// app/notifications/NotificationsPageClient.tsx
import { useNotifications } from '@/lib/notification/notification.hooks'

export default function NotificationsPageClient() {
  const { user } = useAuth()
  const { 
    notifications, 
    loading, 
    activeTab, 
    setActiveTab,
    filteredNotifications,
    markAllRead 
  } = useNotifications({ userId: user?.id })

  // 알림 목록이 자동으로 로드됨
  // 페이지 이탈 시 자동으로 읽음 처리됨

  return (
    <div>
      {/* 알림 목록 렌더링 */}
    </div>
  )
}
```

### 패턴 3: 서비스 함수 직접 사용

```typescript
// lib/notification/notification.service.ts 사용
import { 
  fetchNotifications, 
  fetchUnreadCount, 
  markAllNotificationsRead 
} from '@/lib/notification/notification.service'

// 알림 목록 조회
const notifications = await fetchNotifications()

// 읽지 않은 개수 조회
const count = await fetchUnreadCount()

// 전체 읽음 처리
await markAllNotificationsRead()
```

---

## ⚠️ 주의사항

### 1. 에러 처리

알림 API는 **조용한 실패(Silent Failure)** 패턴을 사용합니다:

- 네트워크 에러나 서버 에러 발생 시 조용히 처리
- UI는 기존 값을 유지하거나 기본값(0 또는 빈 배열)으로 표시
- 사용자에게 에러 메시지를 표시하지 않음

**이유:**
- 알림은 부가 기능이므로 실패해도 주요 기능에 영향 없음
- 서버가 시작 중이거나 일시적으로 연결할 수 없는 상황 대응

### 2. 폴링 최적화

**읽지 않은 개수 폴링:**
- 30초 간격으로 폴링 (너무 자주 호출하지 않음)
- 로그인하지 않은 사용자는 폴링하지 않음
- 페이지 가시성(visibility) 기반 제어는 현재 구현되지 않음 (향후 개선 가능)

### 3. 읽음 처리 최적화

**낙관적 업데이트:**
- UI는 즉시 업데이트하고 서버 요청은 백그라운드에서 처리
- `keepalive: true` 옵션으로 페이지 이탈 시에도 요청 완료 보장
- Fire-and-forget 패턴 사용 (응답을 기다리지 않음)

### 4. 인증 상태 확인

모든 알림 API 호출 전에 사용자 인증 상태를 확인해야 합니다:

```typescript
// 올바른 패턴
if (!user?.id) {
  // 로그인하지 않은 경우 처리
  return
}

// API 호출
const res = await fetch('/api/notifications/...')
```

---

## 🔄 데이터 흐름

### 알림 벨 (읽지 않은 개수)

```
NotificationBell 컴포넌트
  ↓
useAuth() → user 확인
  ↓ (로그인한 경우)
fetch('/api/notifications/unread-count')
  ↓
서버: Supabase에서 읽지 않은 알림 개수 조회
  ↓
응답: { count: number }
  ↓
상태 업데이트: setUnreadCount(count)
  ↓
UI 업데이트: 알림 벨에 배지 표시
  ↓
30초 후 다시 호출 (폴링)
```

### 알림 페이지 (알림 목록)

```
NotificationsPageClient 컴포넌트
  ↓
useNotifications({ userId })
  ↓
fetchNotifications()
  ↓
fetch('/api/notifications')
  ↓
서버: Supabase에서 알림 목록 조회 (최대 50개)
  ↓
응답: { notifications: NotificationItem[] }
  ↓
상태 업데이트: setNotifications(notifications)
  ↓
UI 렌더링: 알림 목록 표시
  ↓
페이지 이탈 시
  ↓
markAllRead() 자동 호출
  ↓
PATCH /api/notifications (mark_all_read: true)
  ↓
서버: 모든 읽지 않은 알림을 읽음 처리
```

---

## 📝 타입 정의

```typescript
// lib/notification/notification.types.ts
export interface NotificationItem {
  id: string
  user_id: string
  type: 'order' | 'point' | 'review' | 'promotion' | 'system'
  title: string
  message: string
  link_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}
```

---

## 🎯 사용 가이드

### 새로운 컴포넌트에서 알림 개수 표시하기

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { fetchUnreadCount } from '@/lib/notification/notification.service'

export default function MyComponent() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0)
      return
    }

    const loadCount = async () => {
      const count = await fetchUnreadCount()
      setUnreadCount(count)
    }

    loadCount()
    const interval = setInterval(loadCount, 30000)

    return () => clearInterval(interval)
  }, [user?.id])

  return <div>읽지 않은 알림: {unreadCount}</div>
}
```

### 알림 목록을 직접 조회하기

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { fetchNotifications } from '@/lib/notification/notification.service'
import type { NotificationItem } from '@/lib/notification/notification.types'

export default function MyNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    const loadNotifications = async () => {
      try {
        const data = await fetchNotifications()
        setNotifications(data)
      } catch (error) {
        console.error('알림 조회 실패:', error)
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [user?.id])

  if (loading) return <div>로딩 중...</div>

  return (
    <div>
      {notifications.map((notification) => (
        <div key={notification.id}>
          {notification.title}
        </div>
      ))}
    </div>
  )
}
```

---

## 🔍 디버깅 팁

### 1. 네트워크 탭에서 확인

브라우저 개발자 도구의 Network 탭에서 다음 API 호출을 확인할 수 있습니다:

- `GET /api/notifications/unread-count` - 30초마다 호출됨
- `GET /api/notifications` - 알림 페이지 진입 시 호출됨
- `PATCH /api/notifications` - 읽음 처리 시 호출됨

### 2. 콘솔 로그 확인

에러 발생 시 서버 콘솔에 다음 로그가 출력됩니다:

```
알림 조회 실패: [에러 내용]
알림 개수 조회 실패: [에러 내용]
알림 읽음 처리 실패: [에러 내용]
```

### 3. 인증 상태 확인

알림이 표시되지 않는다면:

1. 사용자가 로그인했는지 확인 (`user?.id` 존재 여부)
2. Supabase 세션이 유효한지 확인
3. 서버 콘솔에서 인증 에러 확인

---

## 📚 관련 파일

- **API 라우트:**
  - `app/api/notifications/route.ts` - 알림 목록 조회 및 읽음 처리
  - `app/api/notifications/unread-count/route.ts` - 읽지 않은 개수 조회

- **서비스 함수:**
  - `lib/notification/notification.service.ts` - 알림 관련 서비스 함수

- **훅:**
  - `lib/notification/notification.hooks.ts` - `useNotifications` 훅

- **타입:**
  - `lib/notification/notification.types.ts` - 알림 타입 정의

- **컴포넌트:**
  - `components/common/NotificationBell.tsx` - 알림 벨 컴포넌트
  - `app/notifications/NotificationsPageClient.tsx` - 알림 페이지 클라이언트 컴포넌트

