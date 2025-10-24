# 대가 정육백화점 - 웹사이트

정육백화점을 위한 현대적인 e-커머스 웹사이트입니다.

## 주요 기능

- 🛍️ 상품 목록 및 카테고리별 필터링
- 📱 반응형 디자인 (모바일/태블릿/데스크톱)
- 🛒 장바구니 기능
- 💳 주문 및 결제 시스템
- 🎨 현대적이고 직관적인 UI/UX

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **상태관리**: Zustand
- **데이터베이스**: Supabase
- **결제**: 토스페이먼츠 (구현 예정)

## 시작하기

### 1. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 2. 환경 변수 설정

`.env.local.example` 파일을 참고하여 `.env.local` 파일을 생성하고 필요한 환경 변수를 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase 데이터베이스 설정

`supabase-schema.sql` 파일의 내용을 Supabase SQL 에디터에서 실행하여 데이터베이스 테이블을 생성하세요.

### 4. 개발 서버 실행

```bash
npm run dev
# 또는
yarn dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
web/
├── app/                    # Next.js App Router 페이지
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 홈페이지
│   ├── products/          # 상품 페이지
│   ├── cart/              # 장바구니 페이지
│   └── checkout/          # 결제 페이지
├── components/            # 재사용 가능한 컴포넌트
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── ProductCard.tsx
├── lib/                   # 유틸리티 및 설정
│   ├── supabase.ts        # Supabase 클라이언트 및 타입
│   └── store.ts           # Zustand 스토어 (장바구니)
└── public/                # 정적 파일
```

## 데이터베이스 스키마

### Products (상품)
- 상품 정보, 가격, 재고, 카테고리 등

### Cart Items (장바구니)
- 사용자별 장바구니 아이템

### Orders (주문)
- 주문 정보 및 배송 정보

### Order Items (주문 상품)
- 주문별 상품 상세 내역

## 배포

### Vercel (권장)

```bash
npm run build
```

Vercel에 배포하면 자동으로 최적화된 프로덕션 빌드가 생성됩니다.

## 향후 개발 계획

- [ ] 사용자 인증 (로그인/회원가입)
- [ ] 관리자 페이지
- [ ] 리뷰 및 평점 시스템
- [ ] 찜하기 기능
- [ ] 주문 내역 조회
- [ ] 실시간 채팅 고객센터
- [ ] 토스페이먼츠 결제 연동
- [ ] 이미지 최적화 및 CDN

## 라이센스

MIT

