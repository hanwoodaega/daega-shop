import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
    const clientSecret = process.env.NAVER_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/naver/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: '네이버 로그인이 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // 액세스 토큰 요청
    const tokenResponse = await fetch(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=state`,
      {
        method: 'GET',
      }
    )

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      throw new Error('액세스 토큰을 받지 못했습니다.')
    }

    // 사용자 정보 요청
    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    if (userData.resultcode !== '00') {
      throw new Error('사용자 정보를 가져오지 못했습니다.')
    }

    // 사용자 정보 반환
    return NextResponse.json({
      user: {
        id: userData.response.id,
        email: userData.response.email,
        name: userData.response.name,
        profile_image: userData.response.profile_image,
      },
    })
  } catch (error: any) {
    console.error('네이버 OAuth 에러:', error)
    return NextResponse.json(
      { error: error.message || '네이버 로그인 처리 실패' },
      { status: 500 }
    )
  }
}

