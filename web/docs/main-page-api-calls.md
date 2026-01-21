# 메인 페이지 API 호출 정리

이 문서는 메인 페이지(`/`)에 처음 진입할 때 호출되는 모든 API를 정리한 문서입니다.

## 📋 호출 순서 및 분류

### 1️⃣ 서버 사이드 렌더링 (SSR) - 초기 HTML에 포함

서버에서 미리 데이터를 가져와 초기 HTML에 포함시킵니다. SEO 최적화 및 초기 로딩 성능 향상을 위해 사용됩니다.

| API | 호출 위치 | 설명 | 캐시 설정 |
|-----|----------|------|----------|
| `GET /api/collections` | `app/page.tsx` | 활성화된 컬렉션 목록 조회 | `revalidate: 300` (5분) |
| `GET /api/timedeals?limit=5` | `components/timedeal/TimeDealSection.tsx` | 타임딜 상품 조회 (스크롤 모드) | `tags: ['timedeal']` |
| `GET /api/banners` | `components/banner/BannerSection.tsx` | 배너 목록 조회 | `tags: ['banner'], revalidate: 60` (1분) |

**특징:**
- 서버에서 실행되므로 초기 HTML에 데이터가 포함됨
- 캐시 태그를 사용하여 `revalidateTag()`로 무효화 가능
- 에러 발생 시 조용히 처리하고 빈 데이터로 fallback

---

### 2️⃣ 클라이언트 사이드 렌더링 (CSR) - Hydration 후

클라이언트에서 컴포넌트가 마운트된 후 `useEffect`를 통해 호출됩니다.

#### 즉시 호출 (컴포넌트 마운트 시)

| API | 호출 위치 | 설명 | 조건 |
|-----|----------|------|------|
| `GET /api/hero` | `components/sections/HeroSlider.tsx` | 히어로 슬라이더 이미지 조회 | 항상 호출 |
| `GET /api/recommendations` | `components/sections/RecommendationSection.tsx` | 추천 카테고리 목록 조회 | 항상 호출 |
| `GET /api/recommendations/{categoryId}/products` | `components/sections/RecommendationSection.tsx` | 첫 번째 추천 카테고리 상품 조회 | 카테고리 목록 로드 후 자동 호출 |
| `GET /api/timedeals?limit=10` | `lib/timedeal/useTimeDealPolling.ts` | 타임딜 폴링 시작 (전역) | `ClientLayout`에서 시작 |
| `GET /api/notifications/unread-count` | `components/common/NotificationBell.tsx` | 읽지 않은 알림 개수 조회 | 로그인한 사용자만 |

#### 컬렉션 섹션 (컬렉션이 있을 경우)

컬렉션 타입에 따라 다른 API를 호출합니다:

| 컬렉션 타입 | API | 호출 위치 | 설명 |
|-----------|-----|----------|------|
| `timedeal` | `GET /api/timedeals?limit=4` | `lib/collection/collection.service.ts` | 타임딜 컬렉션 (store에서 데이터 사용 시 호출 안 함) |
| 기타 | `GET /api/collections/{collectionType}?limit=4` | `lib/collection/collection.service.ts` | 일반 컬렉션 상품 조회 |

**특징:**
- 각 컬렉션마다 개별적으로 호출됨
- 타임딜 컬렉션은 `useTimeDealStore`에서 데이터를 가져오므로 중복 호출 방지

---

## 🔄 폴링 (Polling) - 주기적 호출

### 타임딜 폴링

| API | 호출 위치 | 주기 | 설명 |
|-----|----------|------|------|
| `GET /api/timedeals?limit=10` | `lib/timedeal/useTimeDealPolling.ts` | 10초마다 | 타임딜 상태 실시간 업데이트 |

**특징:**
- 전역 단일 인스턴스로 실행 (중복 방지)
- 페이지 가시성(visibility) 기반 제어
- 타임딜 종료 시 자동 중단
- 메인 페이지에서는 `limit=10` 사용

### 알림 폴링

| API | 호출 위치 | 주기 | 조건 |
|-----|----------|------|------|
| `GET /api/notifications/unread-count` | `components/common/NotificationBell.tsx` | 30초마다 | 로그인한 사용자만 |

**특징:**
- 로그인하지 않은 사용자는 호출하지 않음
- 에러 발생 시 조용히 처리

---

## 📊 호출 시점 요약

### 초기 로드 (서버 사이드)

```
1. GET /api/collections (서버)
2. GET /api/timedeals?limit=5 (서버)
3. GET /api/banners (서버)
```

### Hydration 후 (클라이언트 사이드)

```
4. GET /api/hero (클라이언트)
5. GET /api/recommendations (클라이언트)
6. GET /api/recommendations/{categoryId}/products (클라이언트, 첫 번째 카테고리)
7. GET /api/timedeals?limit=10 (클라이언트, 폴링 시작)
8. GET /api/notifications/unread-count (클라이언트, 로그인한 경우만)
9. GET /api/collections/{collectionType}?limit=4 (클라이언트, 각 컬렉션마다)
```

---

## ⚠️ 중복 호출 이슈

### 타임딜 API 중복 호출

**문제:**
- 서버: `GET /api/timedeals?limit=5` (TimeDealSection)
- 클라이언트: `GET /api/timedeals?limit=10` (useTimeDealPolling)

**의도:**
- 서버 호출: 초기 HTML에 포함하여 SEO 최적화 및 초기 로딩 성능 향상
- 클라이언트 호출: 실시간 타임딜 상태 업데이트 및 종료 감지

**최적화:**
- `limit`을 다르게 설정하여 서버는 최소한만, 클라이언트는 더 많이 가져옴
- 캐시 태그를 사용하여 부하 최소화
- 향후 서버에서 가져온 데이터를 클라이언트에 전달하고 클라이언트는 폴링만 수행하는 방식으로 개선 가능

---

## 📈 예상 호출 횟수

### 최초 진입 시 (로그인한 사용자, 컬렉션 3개 가정)

**서버 사이드:**
- `/api/collections`: 1회
- `/api/timedeals?limit=5`: 1회
- `/api/banners`: 1회

**클라이언트 사이드:**
- `/api/hero`: 1회
- `/api/recommendations`: 1회
- `/api/recommendations/{categoryId}/products`: 1회
- `/api/timedeals?limit=10`: 1회 (폴링 시작)
- `/api/notifications/unread-count`: 1회
- `/api/collections/{collectionType}?limit=4`: 3회 (컬렉션 개수만큼)

**총계:**
- 서버: 3회
- 클라이언트: 8회
- **합계: 11회**

### 최초 진입 시 (비로그인 사용자, 컬렉션 3개 가정)

**서버 사이드:**
- `/api/collections`: 1회
- `/api/timedeals?limit=5`: 1회
- `/api/banners`: 1회

**클라이언트 사이드:**
- `/api/hero`: 1회
- `/api/recommendations`: 1회
- `/api/recommendations/{categoryId}/products`: 1회
- `/api/timedeals?limit=10`: 1회 (폴링 시작)
- `/api/collections/{collectionType}?limit=4`: 3회 (컬렉션 개수만큼)

**총계:**
- 서버: 3회
- 클라이언트: 7회
- **합계: 10회**

---

## 🔍 상세 호출 흐름

### 1. 서버 사이드 렌더링 단계

```
app/page.tsx (서버 컴포넌트)
├── fetch('/api/collections') → 컬렉션 목록
├── TimeDealSection (서버 컴포넌트)
│   └── fetch('/api/timedeals?limit=5') → 타임딜 데이터
└── BannerSection (서버 컴포넌트)
    └── fetch('/api/banners') → 배너 데이터
```

### 2. 클라이언트 사이드 Hydration 후

```
ClientLayout (클라이언트 컴포넌트)
└── useTimeDealPolling(10)
    └── fetchTimeDeal({ limit: 10 }) → '/api/timedeals?limit=10' (폴링 시작)

HeroSlider (클라이언트 컴포넌트)
└── useEffect
    └── fetch('/api/hero') → 히어로 슬라이더

RecommendationSection (클라이언트 컴포넌트)
├── useEffect
│   └── fetch('/api/recommendations') → 추천 카테고리
└── useEffect (카테고리 선택 후)
    └── fetch('/api/recommendations/{categoryId}/products') → 추천 상품

CollectionSectionContainer (클라이언트 컴포넌트, 컬렉션 개수만큼)
└── useCollectionSection
    └── fetchCollectionSection
        └── fetch('/api/collections/{collectionType}?limit=4') 또는
            fetch('/api/timedeals?limit=4')

NotificationBell (클라이언트 컴포넌트, 로그인한 경우만)
└── useEffect
    └── fetch('/api/notifications/unread-count') → 알림 개수 (30초마다 폴링)
```

---

## 💡 최적화 포인트

### 1. 서버/클라이언트 중복 호출

**현재:**
- 타임딜 API가 서버와 클라이언트에서 각각 호출됨

**개선 방안:**
- 서버에서 가져온 데이터를 클라이언트에 전달 (props 또는 context)
- 클라이언트는 폴링만 수행하여 실시간 업데이트

### 2. 컬렉션 섹션 호출

**현재:**
- 각 컬렉션마다 개별 API 호출

**개선 방안:**
- 컬렉션 목록과 함께 상품 데이터도 함께 가져오는 API 추가
- 또는 서버 사이드에서 컬렉션 데이터를 미리 가져와 전달

### 3. 추천 상품 호출

**현재:**
- 카테고리 목록 조회 → 첫 번째 카테고리 상품 조회 (2단계)

**개선 방안:**
- 첫 번째 카테고리 상품을 함께 반환하는 옵션 추가
- 또는 서버 사이드에서 미리 가져와 전달

---

## 📝 참고사항

- 모든 API 호출은 에러 핸들링이 포함되어 있어 실패해도 페이지는 정상적으로 렌더링됨
- 서버 사이드 호출은 캐시를 활용하여 성능 최적화
- 클라이언트 사이드 호출은 실시간 업데이트를 위해 `cache: 'no-store'` 또는 폴링 사용
- 로그인하지 않은 사용자는 알림 관련 API를 호출하지 않음

