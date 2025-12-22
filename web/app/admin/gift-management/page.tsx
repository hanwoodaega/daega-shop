import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import GiftManagementPage from './_components/GiftManagementPage'

export default async function Page() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login?next=/admin/gift-management')
  }

  // TODO: Add admin role check if needed
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('role')
  //   .eq('id', user.id)
  //   .single()
  //
  // if (profile?.role !== 'admin') {
  //   redirect('/admin/login?next=/admin/gift-management')
  // }

  return <GiftManagementPage />
}
