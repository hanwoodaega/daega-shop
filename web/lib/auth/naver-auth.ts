// 네이버 로그인 처리

export const handleNaverLogin = (nextPath: string = '/') => {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')
  const redirectUri = `${baseUrl}/api/auth/naver`
  const state = Math.random().toString(36).substring(7)
  
  const isSecure = window.location.protocol === 'https:'
  const stateCookieParts = [
    `naver_oauth_state=${encodeURIComponent(state)}`,
    'Path=/',
    'Max-Age=300',
    'SameSite=Lax',
  ]
  if (isSecure) {
    stateCookieParts.push('Secure')
  }
  document.cookie = stateCookieParts.join('; ')

  const nextCookieParts = [
    `naver_oauth_next=${encodeURIComponent(nextPath)}`,
    'Path=/',
    'Max-Age=300',
    'SameSite=Lax',
  ]
  if (isSecure) {
    nextCookieParts.push('Secure')
  }
  document.cookie = nextCookieParts.join('; ')
  
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
    return data.response // { id, email, name }
  } catch (error) {
    console.error('네이버 사용자 정보 조회 실패:', error)
    return null
  }
}

