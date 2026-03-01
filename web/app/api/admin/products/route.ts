import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { assertAdmin } from '@/lib/auth/admin-auth'
import { nameToSlug } from '@/lib/utils/utils'
import { extractActivePromotion } from '@/lib/product/product.service'

export async function GET(request: Request) {
  try { assertAdmin() } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const tag = searchParams.get('tag')
  const status = searchParams.get('status')
  const q = searchParams.get('q') || ''
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')))
  const from = (page - 1) * limit
  const to = from + limit - 1
  const selectFields = `
    id,
    slug,
    brand,
    name,
    price,
    category,
    average_rating,
    review_count,
    weight_gram,
    status,
    created_at,
    updated_at,
    promotion_products (
      promotion_id,
      promotions (
        id,
        type,
        buy_qty,
        discount_percent,
        is_active
      )
    )
  `
  
  let query = supabaseAdmin
    .from('products')
    .select(selectFields, { count: 'exact' })
    .order('created_at', { ascending: false })
  if (status && status !== 'all') {
    query = query.eq('status', status)
  } else {
    query = query.neq('status', 'deleted') // 기본은 deleted 제외
  }
  if (category && category !== '전체') {
    query = query.eq('category', category)
  }
  // tag 필터는 컬렉션 시스템으로 대체됨
  if (q) {
    const like = `%${q}%`
    query = query.or(`name.ilike.${like},brand.ilike.${like}`)
  }
  const { data, error, count } = await query.range(from, to)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const items = (data || []).map((product: any) => {
    const promotion = extractActivePromotion(product)

    let promotionLabel: string | null = null
    if (promotion?.is_active && promotion?.type === 'bogo' && promotion?.buy_qty) {
      promotionLabel = `프로모션 ${promotion.buy_qty}+1`
    } else if (promotion?.is_active && promotion?.type === 'percent' && promotion?.discount_percent) {
      promotionLabel = `프로모션 ${promotion.discount_percent}%`
    }

    return {
      ...product,
      promotion_label: promotionLabel,
      promotion_type: promotion?.type || null,
      promotion_discount_percent: promotion?.discount_percent || null,
      promotion_buy_qty: promotion?.buy_qty || null,
    }
  })

  return NextResponse.json({ items, page, limit, total: count ?? 0 })
}

export async function POST(request: Request) {
  try { assertAdmin() } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  
  let body: any = {}
  try {
    body = await request.json()
  } catch (e) {
    console.error('JSON parse error:', e)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const required = ['name', 'price', 'category']
  for (const key of required) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 })
    }
  }

  // Basic auth check via cookie (middleware guards UI, API double-checks)
  // In route handlers, cookies are not directly accessible via Request; rely on middleware for now or parse headers if needed.

  // slug 생성 (수동 입력이 있으면 사용, 없으면 자동 생성)
  let slug: string | null = null
  
  // slug가 명시적으로 전달되었는지 확인 (빈 문자열도 명시적 입력으로 간주)
  if ('slug' in body) {
    const slugValue = String(body.slug || '').trim()
    if (slugValue) {
      // 수동으로 slug가 입력된 경우 - 그대로 사용
      slug = slugValue
    }
  }
  
  // slug가 없으면 상품명에서 자동 생성
  if (!slug && body.name) {
    slug = nameToSlug(body.name)
  }
  
  // slug 중복 체크 및 고유성 보장
  if (slug) {
    let uniqueSlug = slug
    let counter = 1
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('slug', uniqueSlug)
        .single()
      
      if (!existing) break
      uniqueSlug = `${slug}-${counter}`
      counter++
    }
    slug = uniqueSlug
  }

  const payload: any = {
    brand: body.brand ? String(body.brand) : null,
    name: String(body.name),
    slug: slug || null,
    price: Number(body.price),
    category: String(body.category),
    status: 'active', // 기본값: active
  }

  // 선택적 필드 추가 (unit, origin, weight_gram 등 - 테이블에 컬럼이 있는 경우에만)
  // discount_percent는 products 테이블에 컬럼이 없으므로 제외
  if (body.unit !== undefined && body.unit !== null && body.unit !== '') {
    payload.unit = String(body.unit)
  }
  if (body.origin !== undefined && body.origin !== null && body.origin !== '') {
    payload.origin = String(body.origin)
  }
  if (body.weight_gram !== undefined && body.weight_gram !== null && body.weight_gram !== '') {
    const weightGram = Number(body.weight_gram)
    if (!isNaN(weightGram) && weightGram > 0) {
      payload.weight_gram = weightGram
    }
  }

  try {
    const { data, error } = await supabaseAdmin.from('products').insert([payload]).select('id')
    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message || 'Database error' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, product: data?.[0] })
  } catch (e: any) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


