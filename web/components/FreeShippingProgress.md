# FreeShippingProgress 컴포넌트

택배배송(regular) 시 무료배송까지 남은 금액을 시각적 진행률 바로 표시하는 컴포넌트입니다.

## 기능

- ✅ 실시간 진행률 계산 (0% ~ 100%)
- ✅ 그라데이션 프로그레스 바
- ✅ 달성 시 애니메이션 효과
- ✅ 택배배송(regular)일 때만 표시
- ✅ 픽업/퀵배송 시 자동 숨김

## 사용법

### 기본 사용

```tsx
import FreeShippingProgress from '@/components/FreeShippingProgress'

<FreeShippingProgress 
  totalPrice={45000} 
  deliveryMethod="regular"
/>
```

### Props

| 이름 | 타입 | 기본값 | 필수 | 설명 |
|------|------|--------|------|------|
| `totalPrice` | `number` | - | ✅ | 현재 장바구니 총액 |
| `deliveryMethod` | `'pickup' \| 'quick' \| 'regular'` | `'regular'` | - | 배송 방법 |
| `threshold` | `number` | `50000` | - | 무료배송 기준 금액 |
| `className` | `string` | `''` | - | 추가 CSS 클래스 |

### 배송 방법에 따른 동작

- **`regular`** (택배배송): 진행률 바 표시 ✅
- **`pickup`** (픽업): 표시 안 함 (무료)
- **`quick`** (퀵배송): 표시 안 함 (별도 요금)

## 예시

### 장바구니 페이지

```tsx
// web/app/cart/page.tsx
<FreeShippingProgress 
  totalPrice={getTotalPrice()} 
  deliveryMethod="regular"
  className="mb-4"
/>
```

### 체크아웃 페이지

```tsx
// web/app/checkout/page.tsx
<FreeShippingProgress 
  totalPrice={subtotal} 
  deliveryMethod={deliveryMethod}  // 사용자가 선택한 배송 방법
  className="mt-6"
/>
```

## UI 상태

### 1. 진행 중 (50,000원 미만)

```
🚚 무료배송                        60%
[████████████░░░░░░░░]
20,000원 더 담으면 무료배송 혜택을 받으실 수 있어요!

💡 조금만 더! 저렴한 상품을 추가해보세요
```

### 2. 달성 (50,000원 이상)

```
🚚 무료배송 달성!                  100%
[████████████████████] ✨ (반짝임 애니메이션)
✓ 무료배송이 적용되었습니다!
```

## 디자인 특징

### 컬러 스킴
- **기본**: 파란색 그라데이션 (`blue-400` → `blue-600`)
- **달성**: 초록색 그라데이션 (`green-400` → `green-600`)
- **배경**: 파란색 계열 (`blue-50`, `blue-100`)

### 애니메이션
- 진행률 변경 시: `transition-all duration-500 ease-out`
- 달성 시: `shimmer` 애니메이션 (2초 반복)

## 상수 관리

무료배송 기준 금액은 `lib/constants.ts`에서 관리됩니다:

```typescript
// lib/constants.ts
export const SHIPPING = {
  FREE_THRESHOLD: 50000,    // 무료배송 기준 금액
  DEFAULT_FEE: 3000,        // 기본 배송비
  QUICK_FEE: 5000,          // 퀵배송 추가 요금
} as const
```

### 금액 변경 방법

```typescript
// 무료배송 기준을 30,000원으로 변경하려면
export const SHIPPING = {
  FREE_THRESHOLD: 30000,  // 변경
  DEFAULT_FEE: 3000,
  QUICK_FEE: 5000,
} as const
```

## 성능 최적화

- `useMemo`로 진행률 계산 메모이제이션
- 배송 방법이 `regular`가 아니면 조기 반환 (렌더링 생략)

## 테스트 시나리오

### 1. 기본 동작
```typescript
// 30,000원 → 60% 진행률
<FreeShippingProgress totalPrice={30000} />
// "20,000원 더 담으면 무료배송!"

// 50,000원 → 100% 달성
<FreeShippingProgress totalPrice={50000} />
// "✓ 무료배송이 적용되었습니다!"
```

### 2. 배송 방법 조건
```typescript
// 픽업 → 표시 안 함
<FreeShippingProgress totalPrice={30000} deliveryMethod="pickup" />
// null 반환

// 택배 → 표시
<FreeShippingProgress totalPrice={30000} deliveryMethod="regular" />
// 진행률 바 표시
```

### 3. 커스텀 기준 금액
```typescript
// 100,000원 기준으로 변경
<FreeShippingProgress 
  totalPrice={70000} 
  threshold={100000}
/>
// "30,000원 더 담으면 무료배송!"
```

## 접근성 (Accessibility)

- 시각적 진행률과 함께 텍스트 정보 제공
- 이모지로 직관적 이해 향상
- 색상 외에도 텍스트로 상태 표시 (색맹 사용자 고려)

## 모바일 최적화

- 반응형 디자인 (Tailwind CSS 사용)
- 작은 화면에서도 가독성 유지
- 터치 친화적 레이아웃

## 향후 개선 가능 사항

1. **추천 상품 표시**
   - 목표 금액에 근접하면 부족한 금액대 상품 추천
   
2. **알림 기능**
   - 무료배송 달성 시 사운드/햅틱 피드백
   
3. **A/B 테스트**
   - 다양한 메시지 및 디자인 테스트
   
4. **다국어 지원**
   - i18n 통합

## 관련 파일

- `web/components/FreeShippingProgress.tsx` - 컴포넌트
- `web/lib/constants.ts` - 상수 정의
- `web/app/globals.css` - 애니메이션 스타일
- `web/app/cart/page.tsx` - 장바구니 적용
- `web/app/checkout/page.tsx` - 체크아웃 적용

