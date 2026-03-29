import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import AdminDashboardClient from '@/app/admin/_components/AdminDashboardClient'

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
    
    // 최근 7일 주문 개수
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    
    const { count: recentCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())
      .lte('created_at', todayEnd.toISOString())
    
    return {
      todayOrdersCount: todayCount || 0,
      recent7DaysOrdersCount: recentCount || 0,
    }
  } catch (error) {
    console.error('주문 개수 조회 실패:', error)
    return {
      todayOrdersCount: 0,
      recent7DaysOrdersCount: 0,
    }
  }
}

export default async function AdminPage() {
  // 주문 개수 데이터 가져오기
  const { todayOrdersCount, recent7DaysOrdersCount } = await getOrderCounts()

  return (
    <AdminDashboardClient
      todayOrdersCount={todayOrdersCount}
      recent7DaysOrdersCount={recent7DaysOrdersCount}
    />
  )
}
