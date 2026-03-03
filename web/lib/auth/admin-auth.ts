import { cookies } from 'next/headers'

export async function assertAdmin() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('admin_auth')
  if (!cookie || cookie.value !== '1') {
    const error = new Error('Unauthorized') as Error & { status?: number }
    error.status = 401
    throw error
  }
}

