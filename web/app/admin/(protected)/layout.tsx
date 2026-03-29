import { assertAdmin } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'

/**
 * 로그인은 (protected) 밖의 /admin/login 에 두고,
 * 그 외 관리 화면은 서버에서 세션 검증 후에만 RSC/번들이 이어지도록 막는다.
 */
export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await assertAdmin()
  } catch {
    redirect('/admin/login')
  }
  return <>{children}</>
}
