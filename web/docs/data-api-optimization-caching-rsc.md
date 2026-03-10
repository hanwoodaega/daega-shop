# 데이터·API 최적화: 캐싱 & RSC 정리

이 문서는 **캐싱(SWR/React Query, revalidate)** 과 **서버 컴포넌트(RSC)에서만 데이터 조회** 적용 방안을 정리한 것입니다.

---

## 1. 캐싱 전략 요약

| 방식 | 적합한 경우 | 비고 |
|------|-------------|------|
| **SWR / React Query** | 클라이언트에서 반복 호출하는 API (프로필 요약, 포인트, 주소 목록 등) | stale-while-revalidate, 중복 요청 제거 |
| **Next.js `revalidate`** | 페이지/라우트 단위 캐시가 필요한 정적·준정적 데이터 | `fetch(..., { next: { revalidate: 60 } })` 또는 segment config |
| **API Route 캐시** | GET API 응답을 짧게 캐시해도 되는 경우 | `export const revalidate = 60` 등 |

---

## 2. SWR / React Query 도입 (클라이언트 캐싱)

### 2.1 우선 적용 대상

- **`/api/profile/info`**  
  - 사용처: profile layout(displayName), profile 페이지(주문/쿠폰/포인트 개수), Header  
  - 동일 데이터를 여러 곳에서 쓰므로 **한 번 fetch 후 캐시 공유**가 유리함.

- **`/api/points`**  
  - 사용처: profile/points 페이지, checkout(포인트 표시)  
  - 포인트 페이지에서 이미 불러온 값을 결제 단계에서 재사용 가능.

- **`/api/addresses`**  
  - 사용처: profile/addresses, checkout, cart(배송지 선택)  
  - 주소 목록은 자주 바뀌지 않으므로 캐시 후 무효화만 잘 하면 됨.

- **`/api/coupons`**  
  - 사용처: profile/coupons, checkout(쿠폰 목록)  
  - 탭 전환·다시 들어올 때 캐시 hit으로 체감 속도 개선.

### 2.2 적용 방법 (SWR 예시)

```ts
// lib/swr.ts 또는 hooks/useProfileInfo.ts
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

export function useProfileInfo() {
  const { data, error, mutate } = useSWR('/api/profile/info', fetcher, {
    revalidateOnFocus: false,  // 탭 복귀 시 불필요한 재검증 줄이기
    dedupingInterval: 5000,   // 5초 내 중복 요청 방지
  })
  return { data, error, mutate }
}
```

- **무효화**: 로그아웃 시 `mutate()` 호출, 주소/쿠폰 추가·수정·삭제 후 해당 키만 `mutate()`.

### 2.3 적용 방법 (React Query 예시)

```ts
// app/providers.tsx 등에서 QueryClientProvider 설정 후
import { useQuery } from '@tanstack/react-query'

export function useProfileInfo() {
  return useQuery({
    queryKey: ['profile', 'info'],
    queryFn: () => fetch('/api/profile/info').then((r) => r.json()),
    staleTime: 60 * 1000,  // 1분간 fresh
  })
}
```

- **무효화**: `queryClient.invalidateQueries({ queryKey: ['profile', 'info'] })` 등.

### 2.4 선택 시 참고

- **SWR**: 설정 적고 가벼움, Next.js와 친숙.
- **React Query**: 캐시·무효화·백그라운드 갱신 제어가 더 세밀함. 이미 사용 중이면 통일하는 편이 좋음.

---

## 3. Next.js `revalidate` (서버/라우트 캐시)

### 3.1 적합한 API·페이지

- **히어로/배너**  
  - `GET /api/hero`, `GET /api/banners/[slug]`  
  - 변경 빈도가 낮으면 `revalidate: 60`(1분) 또는 300(5분) 적용.

- **추천/컬렉션**  
  - `GET /api/recommendations`, `GET /api/collections/[slug]`  
  - 상품 구성이 자주 안 바뀌면 짧은 revalidate로 캐시.

- **정적에 가까운 페이지**  
  - `/terms`, `/faq`, `/profile/faq` 등  
  - 빌드 시 생성 후 `revalidate`로 주기적 갱신 가능.

### 3.2 적용 방법

**방법 A: Server Component / server 쪽 fetch**

```ts
// app/page.tsx (RSC)
const res = await fetch(`${base}/api/hero`, {
  next: { revalidate: 60 },
})
```

**방법 B: Route Segment Config**

```ts
// app/hero/route.ts 또는 레이아웃
export const revalidate = 60
```

- GET API 라우트에서 `revalidate`를 export하면 해당 라우트 응답이 캐시됨(Next.js 동작에 따름).

---

## 4. RSC(서버 컴포넌트)에서만 데이터 조회

### 4.1 원칙

- **서버 컴포넌트**: 초기 HTML에 필요한 데이터는 서버에서만 fetch.  
  - 클라이언트 번들에 fetch 로직이 안 들어가고, 첫 페인트가 빨라짐.
- **클라이언트 컴포넌트**: 인터랙션·실시간성이 필요한 부분만 `'use client'` + fetch 또는 SWR/React Query.

### 4.2 우선 적용 후보

| 페이지/영역 | 현재 | RSC 적용 시 |
|-------------|------|-------------|
| **마이페이지 레이아웃** | layout에서 `useEffect` + `fetch('/api/profile/info')` | 레이아웃은 서버 컴포넌트로 두고, profile 정보는 서버에서 fetch 후 props로 전달. 또는 서버 레이아웃에서만 fetch하고 클라이언트는 표시만. |
| **주문 목록** (`/profile`) | 클라이언트에서 `useOrders` 등으로 fetch | 페이지를 RSC로 두고 서버에서 `/api/orders` 호출 후, 목록 UI만 클라이언트 컴포넌트로 전달. |
| **상품 목록** (`/products`, 컬렉션) | `product.service` 등에서 클라이언트 fetch | RSC에서 목록 데이터 fetch, 카드/리스트는 클라이언트 컴포넌트로 전달. |
| **히어로/배너** | `HeroSlider` 등에서 클라이언트 fetch | RSC 또는 레이아웃에서 fetch 후 props. |

### 4.3 적용 시 주의

- **인증이 필요한 API**  
  - 서버에서 `cookies()` 등으로 세션 확인 후 fetch.  
  - `requireActiveUserFromServer()` 같은 기존 패턴 재사용.
- **클라이언트 전용 상태**  
  - 폼, 모달, 탭 선택 등은 계속 클라이언트 컴포넌트.  
  - “데이터만 서버, UI 상태는 클라이언트”로 나누면 됨.

### 4.4 단계별 제안

1. **1단계**: 히어로/배너/추천 등 **비로그인 공개 데이터**를 RSC에서 fetch하고 `revalidate` 적용.
2. **2단계**: **마이페이지/주문 목록**처럼 로그인 필수 구간을 RSC로 가져가기 (서버에서 세션 확인 후 fetch).
3. **3단계**: 나머지 프로필(쿠폰, 포인트, 주소 등)은 기존처럼 클라이언트 fetch + **SWR/React Query**로 캐싱만 강화.

---

## 5. 작업 순서 제안

1. **캐싱 라이브러리 선택**  
   - SWR vs React Query 중 하나로 통일.
2. **공통 fetcher + Provider 설정**  
   - `lib/swr.ts` 또는 `providers/QueryProvider.tsx` 등.
3. **profile info / points / addresses / coupons**에 SWR 또는 React Query 훅 적용 및 기존 `useEffect` fetch 제거.
4. **무효화 규칙 정리**  
   - 로그아웃, 주소/쿠폰/포인트 변경 시 어떤 키를 invalidate할지 문서화.
5. **revalidate 적용**  
   - `/api/hero`, `/api/banners`, `/api/recommendations` 등부터 `revalidate: 60` 수준으로 적용.
6. **RSC 전환**  
   - 공개 페이지(메인, 상품/컬렉션) → 마이페이지/주문 순으로 서버 fetch 이전.

---

## 6. 참고: 이미 적용된/확인된 것

- **필드 최소화**  
  - `/api/points`, `/api/points/history`, `/api/addresses`, `/api/profile/info` 등 필요한 필드만 select 하도록 이미 수정됨.
- **profile/info**  
  - 주문 개수는 `count`만, 쿠폰은 유효기간 판단 필드만 조회하도록 정리됨.

이 순서대로 적용하면 “필요한 데이터만 요청”에 더해 “캐싱”과 “서버에서만 조회”까지 정리할 수 있습니다.
