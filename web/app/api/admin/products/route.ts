import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'
import { nameToSlug } from '@/lib/utils'

export async function GET(request: Request) {
  try { assertAdmin() } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const tag = searchParams.get('tag')
  const q = searchParams.get('q') || ''
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')))
  const from = (page - 1) * limit
  const to = from + limit - 1
  let query = supabaseAdmin
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (category && category !== '전체') {
    query = query.eq('category', category)
  }
  if (tag && tag !== '전체') {
    if (tag === 'new') query = query.eq('is_new', true)
    else if (tag === 'best') query = query.eq('is_best', true)
    else if (tag === 'sale') query = query.eq('is_sale', true)
    else if (tag === 'budget') query = query.eq('is_budget', true)
  }
  if (q) {
    const like = `%${q}%`
    query = query.or(`name.ilike.${like},description.ilike.${like}`)
  }
  const { data, error, count } = await query.range(from, to)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data || [], page, limit, total: count ?? 0 })
}

export async function POST(request: Request) {
  try { assertAdmin() } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const body = await request.json().catch(() => ({}))

  const required = ['name', 'price', 'category', 'stock', 'unit', 'origin']
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

  const payload = {
    brand: body.brand ? String(body.brand) : null,
    name: String(body.name),
    slug: slug || null,
    price: Number(body.price),
    image_url: String(body.image_url || ''),
    category: String(body.category),
    stock: Number(body.stock),
    discount_percent: body.discount_percent !== undefined && body.discount_percent !== null && body.discount_percent !== ''
      ? Math.max(0, Math.min(100, Number(body.discount_percent)))
      : null,
  }

  try {
    const { error } = await supabaseAdmin.from('products').insert([payload])
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


