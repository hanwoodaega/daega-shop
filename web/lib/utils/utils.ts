/**
 * 공통 유틸리티 함수
 */

const MOBILE_USER_AGENT_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
const KAKAOTALK_USER_AGENT_REGEX = /KAKAOTALK/i

const getUserAgent = (): string => {
  if (typeof navigator === 'undefined') {
    return ''
  }
  return navigator.userAgent || ''
}

export function isMobileUserAgent(): boolean {
  return MOBILE_USER_AGENT_REGEX.test(getUserAgent())
}

/**
 * 모바일 디바이스 여부 확인 (OS, UA, 터치 지원 종합 판단)
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;

  // OS 기반 체크
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // UA 기반 모바일 여부
  const isUAMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // 터치 여부 체크
  const touchSupport =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;

  return (isAndroid || isIOS || isUAMobile) && touchSupport;
}

/**
 * PC 디바이스 여부 확인
 */
export function isPC(): boolean {
  return !isMobileDevice();
}

export function hasKakaoTalkApp(): boolean {
  return KAKAOTALK_USER_AGENT_REGEX.test(getUserAgent())
}

export function canUseKakaoDeepLink(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  return isMobileUserAgent() && hasKakaoTalkApp()
}

/**
 * 숫자를 한국어 형식의 가격 문자열로 변환
 * @param price 가격
 * @returns 포맷된 가격 문자열 (예: "1,234,567")
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price)
}

/**
 * 날짜를 한국어 형식으로 변환
 * @param dateString 날짜 문자열
 * @returns 포맷된 날짜 문자열 (예: "2024.11.12")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 프로모션 타입에 따른 필요 개수 반환
 */
export function getPromotionRequiredCount(promotionType: string | null | undefined): number {
  if (promotionType === '3+1') return 4
  if (promotionType === '2+1') return 3
  return 2
}

/**
 * 프로모션 타입에 따른 유료 개수 반환
 */
export function getPromotionPaidCount(promotionType: string | null | undefined): number {
  if (promotionType === '3+1') return 3
  if (promotionType === '2+1') return 2
  return 1
}

/**
 * 프로모션 수량 총합 계산
 */
export function getTotalPromoQuantity(quantities: {[key: string]: number}): number {
  return Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
}

/**
 * 스크롤 이벤트 핸들러 생성 (상단으로 스크롤 버튼 표시용)
 */
export function createScrollToTopHandler(
  threshold: number = 300,
  setShowScrollTop: (show: boolean) => void
): () => void {
  return () => {
    if (window.scrollY > threshold) {
      setShowScrollTop(true)
    } else {
      setShowScrollTop(false)
    }
  }
}

/**
 * 부드럽게 상단으로 스크롤
 */
export function scrollToTop(): void {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

/**
 * throttle 함수: 지정된 시간 간격으로만 함수 실행
 * 스크롤 이벤트 최적화에 사용
 * @param func 실행할 함수
 * @param delay 간격 (ms)
 * @returns throttled 함수
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0
  
  return function (this: any, ...args: Parameters<T>) {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func.apply(this, args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

/**
 * 상품 이름을 slug로 변환합니다.
 * 예: "한우대가 NO.9 프리미엄 세트" → "hanwoo-daega-no9-premium-set"
 * @param name 상품 이름
 * @returns slug 문자열
 */
export function nameToSlug(name: string): string {
  // 한글을 영문으로 변환하는 매핑
  const koreanMap: Record<string, string> = {
    '한우': 'hanwoo',
    '대가': 'daega',
    '프리미엄': 'premium',
    '세트': 'set',
    '등심': 'tenderloin',
    '갈비': 'rib',
    '안심': 'sirloin',
    '하림': 'harim',
    '닭가슴살': 'breast',
    '닭·오리': 'chicken',
    '가슴살': 'breast',
    '블랙페퍼': 'blackpepper',
    '페퍼': 'pepper',
    '한돈': 'pork',
    '수입육': 'imported',
    '가공육': 'processed',
    '양념육': 'cooked',
    '과일·야채': 'vegetable',
    '채끝': 'tenderloin',
    '갈비살': 'ribeye',
    '살치살': 'chuck',
    '부채살': 'flank',
    '업진살': 'top-blade',
  }
  
  let result = name.trim()
  
  // 기본적인 한글 단어 매핑 (긴 단어부터 매칭)
  const sortedEntries = Object.entries(koreanMap).sort((a, b) => b[0].length - a[0].length)
  sortedEntries.forEach(([kor, eng]) => {
    result = result.replace(new RegExp(kor, 'gi'), eng)
  })
  
  // 남은 한글과 특수문자 제거, 영어/숫자/하이픈만 남기기
  result = result
    .replace(/[가-힣]/g, '') // 한글 제거
    .replace(/[^\w\s-]/g, '') // 특수문자 제거 (영어, 숫자, 공백, 하이픈만 남김)
    .replace(/\s+/g, '-')      // 공백을 하이픈으로
    .replace(/-+/g, '-')       // 연속된 하이픈을 하나로
    .toLowerCase()             // 소문자로 변환
    .trim()
    .replace(/^-+|-+$/g, '')  // 앞뒤 하이픈 제거
  
  // 빈 문자열이거나 너무 짧으면 기본값
  if (!result || result.length < 2) {
    return 'product'
  }
  
  return result
}

