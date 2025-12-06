'use client'

import { useEffect, useState } from "react";

/**
 * 모바일 디바이스 여부 확인 훅
 */
export function useIsMobile() {
  // Hydration 에러 방지: 초기값은 항상 false
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isUAMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    
    // 터치 지원 여부 - (pointer: coarse)가 가장 정확함
    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const hasTouchStart = "ontouchstart" in window;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    
    // (pointer: coarse)가 true면 확실히 터치 디바이스
    // false면 다른 조건들을 확인하되, 모두 만족해야 함 (AND 조건)
    // 노트북에서는 (pointer: coarse)가 false여야 함
    let touchSupport: boolean;
    if (hasCoarsePointer) {
      touchSupport = true;
    } else {
      touchSupport = hasTouchStart && maxTouchPoints > 0;
    }
    
    const mobile = (isAndroid || isIOS || isUAMobile) && touchSupport;
    
    setIsMobile(mobile);
    console.log('=== 디바이스 정보 ===');
    console.log('User Agent:', ua);
    console.log('운영체제 체크:', {
      isAndroid,
      isIOS,
      isUAMobile
    });
    console.log('터치 지원 체크:', {
      hasCoarsePointer: hasCoarsePointer,
      hasTouchStart: hasTouchStart,
      maxTouchPoints: maxTouchPoints,
      touchSupport: touchSupport
    });
    console.log('최종 판단:', {
      mobile: mobile,
      isPC: !mobile
    });
    console.log('==================');
  }, []);

  return isMobile;
}

/**
 * PC 디바이스 여부 확인 훅
 */
export function useIsPC() {
  const isMobile = useIsMobile();
  return !isMobile;
}

