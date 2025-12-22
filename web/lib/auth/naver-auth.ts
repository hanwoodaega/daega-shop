// 네이버 로그인 처리

export const handleNaverLogin = () => {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
  const redirectUri = `${window.location.origin}/auth/naver/callback`
  const state = Math.random().toString(36).substring(7)
  
  // 상태값 저장 (CSRF 방지)
  sessionStorage.setItem('naver_oauth_state', state)
  
  // 네이버 로그인 URL로 리다이렉트
  const naverLoginUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  
  window.location.href = naverLoginUrl
}

export const getNaverUserInfo = async (accessToken: string) => {
  try {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    const data = await response.json()
    return data.response // { id, email, name, profile_image }
  } catch (error) {
    console.error('네이버 사용자 정보 조회 실패:', error)
    return null
  }
}

