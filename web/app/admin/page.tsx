import { assertAdmin } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './_components/AdminDashboardClient'

// 서버에서 주문 개수 조회
async function getOrderCounts() {
  try {
    const supabase = createSupabaseAdminClient()
    
    // 오늘 주문 개수
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    
    const { count: todayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .lte('created_at', todayEnd.toISOString())
    
    // 최근 14일 주문 개수
    const fourteenDaysAgo = new Date(today)
    fourteenDaysAgo.setDate(today.getDate() - 14)
    
    const { count: recentCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lte('created_at', todayEnd.toISOString())
    
    return {
      todayOrdersCount: todayCount || 0,
      recent14DaysOrdersCount: recentCount || 0,
    }
  } catch (error) {
    console.error('주문 개수 조회 실패:', error)
    return {
      todayOrdersCount: 0,
      recent14DaysOrdersCount: 0,
    }
  }
}

export default async function AdminPage() {
  // 서버 사이드 인증 체크
  try {
    assertAdmin()
  } catch (error) {
    // 인증 실패 시 로그인 페이지로 리다이렉트
    redirect('/admin/login?next=/admin')
  }

  // 주문 개수 데이터 가져오기
  const { todayOrdersCount, recent14DaysOrdersCount } = await getOrderCounts()

  return (
    <AdminDashboardClient
      todayOrdersCount={todayOrdersCount}
      recent14DaysOrdersCount={recent14DaysOrdersCount}
    />
  )
}
