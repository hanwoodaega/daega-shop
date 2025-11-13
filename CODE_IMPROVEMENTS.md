# 코드 개선 사항

## 프로젝트 개요
**대가 정육백화점** - Next.js 기반 전자상거래 플랫폼 (정육 쇼핑몰)

**기술 스택:**
- Frontend: Next.js 14 (App Router), React 18, TypeScript
- Backend: Supabase (PostgreSQL, Auth, Storage)
- State Management: Zustand
- Styling: Tailwind CSS
- Notifications: React Hot Toast

---

## 1. 아키텍처 및 구조

### 1.1 환경 변수 관리
**문제점:**
- 환경 변수가 코드 전체에 직접 사용됨 (`process.env.NEXT_PUBLIC_SUPABASE_URL`)
- 환경 변수 검증 로직이 없음
- `.env.example` 파일이 없음

**개선 방안:**
```typescript
// lib/env.ts 파일 생성 필요
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  naver: {
    clientId: process.env.NAVER_CLIENT_ID!,
    clientSecret: process.env.NAVER_CLIENT_SECRET!,
  }
}

// 초기화 시 검증
Object.entries(env).forEach(([key, value]) => {
  if (!value) throw new Error(`Missing env: ${key}`)
})
```

### 1.2 디렉토리 구조
**현재 구조는 양호하나 개선 가능:**
```
web/
├── app/              # Next.js App Router
├── components/       # React 컴포넌트
├── lib/             # 유틸리티, 훅, 타입
├── types/           # 공통 타입 정의
└── public/          # 정적 파일
```

**권장 사항:**
- `lib/api/` - API 클라이언트 함수들을 별도 관리
- `lib/constants/` - 상수들을 별도 파일로 관리
- `lib/hooks/` - 커스텀 훅들 (이미 일부 존재)
- `lib/services/` - 비즈니스 로직 분리

---

## 2. 코드 품질

### 2.1 타입 안정성
**문제점:**
```typescript
// 현재: any 타입 사용
const product = Array.isArray(item.products) ? item.products[0] : item.products

// auth-context.tsx에서
supabase.auth.getSession().then(({ data: { session } }: any) => {
```

**개선 방안:**
```typescript
// 명시적 타입 정의
import { Session } from '@supabase/supabase-js'

supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {

// 타입 가드 사용
function isProduct(value: unknown): value is Product {
  return typeof value === 'object' && value !== null && 'id' in value
}
```

### 2.2 에러 처리 일관성
**문제점:**
- 에러 처리가 파일마다 다름
- 일부는 toast만 표시, 일부는 console.error만 사용
- 사용자 친화적 메시지 부족

**개선 방안:**
```typescript
// 에러 핸들러 통합 사용
try {
  await fetchData()
} catch (error) {
  showError(error, { duration: 4000 }) // lib/error-handler.ts 이미 존재
  // 추가로 에러 로깅 서비스 연동 (Sentry 등)
}
```

### 2.3 코드 중복
**문제점:**
```typescript
// Supabase 클라이언트 생성 코드가 여러 API 라우트에 반복됨
const cookieStore = cookies()
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { ... } }
)
```

**개선 방안:**
- `lib/supabase-server.ts`에 이미 함수가 있으므로 일관되게 사용
- API 라우트에서 직접 클라이언트 생성하지 말고 헬퍼 함수 사용

### 2.4 매직 넘버 및 하드코딩
**문제점:**
```typescript
// page.tsx
const PAGE_SIZE = 20  // 여러 파일에 중복
if (getTotalPrice() >= 50000) // 무료 배송 기준 하드코딩
```

**개선 방안:**
```typescript
// lib/constants.ts
export const PAGINATION = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

export const SHIPPING = {
  FREE_THRESHOLD: 50000,
  DEFAULT_FEE: 3000,
} as const
```

---

## 3. 성능 최적화

### 3.1 React 최적화
**현재 잘 구현된 부분:**
- `ProductCard`에 `memo` 사용 ✅
- Zustand selector 패턴 사용 ✅
- `useMemo`, `useCallback` 적절히 사용 ✅

**개선 가능한 부분:**
```typescript
// 1. 의존성 배열 최적화
useEffect(() => {
  loadWishlistProducts()
}, [wishlistIds.join(',')]) // 배열 직렬화로 불필요한 재실행 방지 ✅

// 2. 동적 import 활용
const ReviewWriteModal = dynamic(() => import('@/components/review/ReviewWriteModal'), {
  loading: () => <div>Loading...</div>
})
```

### 3.2 데이터베이스 쿼리 최적화
**문제점:**
```typescript
// 장바구니 조회 시 상품 정보를 매번 조인
const { data } = await supabase
  .from('carts')
  .select(`*, products (*)`)
```

**개선 방안:**
- 자주 조회하는 데이터는 캐싱 (React Query 또는 SWR 도입)
- 필요한 필드만 select (SELECT *)
- 페이지네이션 구현 (상품 목록에는 이미 구현됨 ✅)

### 3.3 이미지 최적화
**문제점:**
```typescript
// ProductCard.tsx에서 Next.js Image 사용 ✅
// 하지만 placeholder 이미지 처리가 복잡함
```

**개선 방안:**
- 이미지 CDN 사용 (Supabase Storage + CDN)
- WebP 포맷 사용
- blur placeholder 추가

---

## 4. 보안

### 4.1 인증/인가
**문제점:**
```typescript
// middleware.ts - 쿠키 값만으로 관리자 인증
if (cookie?.value !== '1') {
  // 매우 취약함
}
```

**개선 방안:**
- JWT 토큰 기반 인증
- Supabase RLS (Row Level Security) 강화
- 관리자 권한을 데이터베이스에 저장
- CSRF 토큰 사용

### 4.2 입력 검증
**문제점:**
- 클라이언트 측 검증만 존재
- 서버 측 검증 부족

**개선 방안:**
```typescript
// API 라우트에서 입력 검증
import { z } from 'zod'

const orderSchema = z.object({
  total_amount: z.number().positive(),
  shipping_address: z.string().min(10),
  // ...
})

const body = orderSchema.parse(await request.json())
```

### 4.3 SQL 인젝션 방지
**현재 상태:** Supabase 클라이언트 사용으로 기본 방어 ✅

---

## 5. 기능 개선

### 5.1 로딩 및 에러 상태
**현재 상태:**
- Skeleton UI 구현 ✅
- 로딩 스피너 사용 ✅

**개선 가능:**
```typescript
// Suspense와 Error Boundary 활용
<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<Skeleton />}>
    <ProductList />
  </Suspense>
</ErrorBoundary>
```

### 5.2 검색 기능
**개선 방안:**
- 검색어 자동완성
- 최근 검색어 저장
- 검색 결과 하이라이트
- 필터링 (가격, 카테고리, 정렬)

### 5.3 장바구니/위시리스트 동기화
**현재 문제:**
- localStorage와 DB 간 동기화 로직이 복잡
- 로그인 시 여러 번 동기화 시도

**개선 방안:**
- 동기화 로직을 하나의 서비스로 통합
- 동기화 상태를 명확히 관리
- 실패 시 재시도 로직

---

## 6. 테스트

### 6.1 단위 테스트
**현재 상태:** 테스트 파일 없음 ❌

**개선 방안:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# 주요 테스트 대상
- lib/utils.ts (formatPrice, calculateDiscountedPrice 등)
- lib/store.ts (Zustand store)
- components/ProductCard.tsx
```

### 6.2 E2E 테스트
**개선 방안:**
```bash
npm install --save-dev playwright

# 테스트 시나리오
- 상품 조회 → 장바구니 추가 → 주문
- 로그인 → 위시리스트 추가
- 리뷰 작성
```

---

## 7. 개발 경험 (DX)

### 7.1 린팅 및 포맷팅
**개선 방안:**
```json
// .eslintrc.json 강화
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### 7.2 Git Hooks
**개선 방안:**
```bash
npm install --save-dev husky lint-staged

# pre-commit hook: 린트 + 포맷팅
# pre-push hook: 테스트 실행
```

### 7.3 문서화
**현재 상태:** 코드 주석은 있으나 API 문서 없음

**개선 방안:**
- API 라우트 문서화 (Swagger/OpenAPI)
- Storybook으로 컴포넌트 문서화
- 아키텍처 다이어그램

---

## 8. 배포 및 모니터링

### 8.1 CI/CD
**개선 방안:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### 8.2 모니터링
**개선 방안:**
- Sentry 연동 (에러 트래킹)
- Vercel Analytics (성능 모니터링)
- 로그 집계 (LogRocket, Datadog)

### 8.3 성능 메트릭
**측정 항목:**
- Core Web Vitals (LCP, FID, CLS)
- API 응답 시간
- 데이터베이스 쿼리 성능

---

## 9. 우선순위별 개선 로드맵

### 🔴 High Priority (즉시 개선)
1. ✅ **보안**: 관리자 인증 강화
2. ✅ **타입 안정성**: `any` 타입 제거
3. ✅ **환경 변수**: 검증 로직 추가
4. ✅ **에러 처리**: 일관된 에러 핸들링

### 🟡 Medium Priority (1-2주 내)
5. 입력 검증 (Zod)
6. 테스트 추가 (Jest, Playwright)
7. 코드 중복 제거
8. 상수 관리 개선

### 🟢 Low Priority (장기)
9. 검색 기능 고도화
10. 캐싱 전략 (React Query)
11. 이미지 최적화
12. 문서화 강화

---

## 10. 특히 우수한 부분 (유지)

1. ✅ **성능 최적화**: `memo`, `useCallback`, `useMemo` 적절히 사용
2. ✅ **Zustand Selector 패턴**: 불필요한 리렌더링 방지
3. ✅ **Skeleton UI**: 로딩 상태 UX 우수
4. ✅ **에러 핸들러 구조**: `lib/error-handler.ts`, `lib/errors.ts` 잘 설계됨
5. ✅ **프로모션 시스템**: 복잡한 비즈니스 로직을 잘 구현
6. ✅ **무한 스크롤**: 페이지네이션 구현 우수
7. ✅ **반응형 디자인**: 모바일/데스크톱 모두 고려
8. ✅ **Optimistic Update**: 장바구니 UX 향상

---

## 참고 자료
- [Next.js Best Practices](https://nextjs.org/docs)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

