import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/auth/admin-auth'
import GiftManagementPage from './_components/GiftManagementPage'

export default async function Page() {
  try {
    await assertAdmin()
  } catch {
    redirect('/admin/login?next=/admin/gift-management')
  }

  return <GiftManagementPage />
}
