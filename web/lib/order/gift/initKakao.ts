/**
 * 카카오 SDK 초기화 유틸리티
 * 페이지 로드 시 한 번만 호출되어야 함
 */
export function initKakaoSDK(): void {
  if (typeof window === 'undefined') return
  if (window.Kakao) return // 이미 로드됨

  const script = document.createElement('script')
  script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
  script.async = true
  script.onload = () => {
    const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || ''
    if (kakaoAppKey && window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(kakaoAppKey)
      } catch (error) {
        // SDK 초기화 실패 (조용히 처리)
        console.warn('Kakao SDK initialization failed:', error)
      }
    }
  }
  script.onerror = () => {
    // SDK 스크립트 로드 실패 (조용히 처리)
    console.warn('Failed to load Kakao SDK script')
  }
  document.head.appendChild(script)
}

