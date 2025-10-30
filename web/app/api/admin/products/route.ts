import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

export async function GET(request: Request) {
  try { assertAdmin() } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
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

  const payload = {
    brand: body.brand ? String(body.brand) : null,
    name: String(body.name),
    description: String(body.description || ''),
    price: Number(body.price),
    image_url: String(body.image_url || ''),
    category: String(body.category),
    stock: Number(body.stock),
    unit: String(body.unit),
    weight: Number(body.weight || 0),
    origin: String(body.origin || ''),
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


