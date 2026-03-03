import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'

// GET /api/admin/reviews?status=pending|approved|rejected&page=&limit=
export async function GET(request: NextRequest) {
  try {
    try { await assertAdmin() } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = await createSupabaseServerClient()
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const date = searchParams.get('date') || ''
    const offset = (page - 1) * limit

    // status 컬럼이 없을 수도 있으니, 우선 시도 후 실패 시 폴백
    let data: any[] | null = null
    let count: number | null = null
    let error: any = null
    try {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          users!reviews_user_id_fkey(name),
          products!reviews_product_id_fkey(name, brand)
        `, { count: 'exact' })
        .eq('status', status)
      
      // 날짜 필터 적용
      if (date) {
        const startDate = new Date(date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(date)
        endDate.setHours(23, 59, 59, 999)
        
        query = query
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      }
      
      const res = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      data = res.data as any[] | null
      count = res.count as number | null
      error = res.error
    } catch (e: any) {
      error = e
    }

    // 폴백: 전체 리뷰에서 페이지네이션
    if (error) {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          users!reviews_user_id_fkey(name),
          products!reviews_product_id_fkey(name, brand)
        `, { count: 'exact' })
      
      // 날짜 필터 적용
      if (date) {
        const startDate = new Date(date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(date)
        endDate.setHours(23, 59, 59, 999)
        
        query = query
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      }
      
      const res = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      data = res.data as any[] | null
      count = res.count as number | null
    }

    const list = (data || []).map((r: any) => ({
      ...r,
      user_name: r.users?.name || '익명',
      product: r.products ? {
        name: r.products.name,
        image_url: null,
        brand: r.products.brand,
      } : null,
      users: undefined,
      products: undefined,
    }))

    return NextResponse.json({
      reviews: list,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('관리자 리뷰 목록 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}


