'use client'

/**
 * 모바일 여부 훅 (현재는 항상 false 반환)
 * - 기존 UA/터치 기반 판별 로직은 제거
 * - 필요해지면 여기서 다시 구현
 */
export function useIsMobile() {
  return false;
}

/** PC 디바이스 여부 훅 (모바일이 아니라고 가정) */
export function useIsPC() {
  const isMobile = useIsMobile();
  return !isMobile;
}

