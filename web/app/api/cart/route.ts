import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { extractActivePromotion } from '@/lib/product/product.service'
import { getFinalPricing } from '@/lib/product/product.pricing'

export const dynamic = 'force-dynamic'

// GET: 장바구니 조회
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const fetchCartRows = async () => {
      return supabase
        .from('carts')
        .select(`
          id,
          product_id,
          quantity,
          promotion_type,
          promotion_group_id,
          discount_percent,
          created_at,
          updated_at,
          products (
            id,
            slug,
            name,
            price,
            brand,
            status,
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
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
    }

    // 장바구니 조회 (상품 정보, 프로모션 정보 포함)
    // status 필드를 SELECT에 포함해야 .neq('products.status') 필터가 작동함
    const { data, error } = await fetchCartRows()

    if (error) {
      console.error('[API] 장바구니 조회 실패:', error)
      console.error('[API] 에러 코드:', error.code)
      console.error('[API] 에러 메시지:', error.message)
      return NextResponse.json({ error: '장바구니 조회 실패' }, { status: 500 })
    }

    // 상품 이미지 조회 (product_id 목록)
    const productIds = (data || []).map((item: any) => item.product_id).filter(Boolean)
    let productImages: { [key: string]: string } = {}
    let timedealDiscountMap = new Map<string, number>()
    
    if (productIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url')
        .in('product_id', productIds)
        .eq('is_primary', true)
      
      if (imagesData) {
        productImages = imagesData.reduce((acc: any, img: any) => {
          acc[img.product_id] = img.image_url
          return acc
        }, {})
      }

      // 타임딜 할인율 조회 (활성 타임딜 기준)
      try {
        const now = new Date().toISOString()
        const { data: activeTimedeal } = await supabase
          .from('timedeals')
          .select('id')
          .lte('start_at', now)
          .gte('end_at', now)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (activeTimedeal) {
          const { data: timedealProducts } = await supabase
            .from('timedeal_products')
            .select('product_id, discount_percent')
            .eq('timedeal_id', activeTimedeal.id)
            .in('product_id', productIds)

          if (timedealProducts) {
            timedealProducts.forEach((tp: any) => {
              timedealDiscountMap.set(tp.product_id, tp.discount_percent || 0)
            })
          }
        }
      } catch (error) {
        console.error('타임딜 할인율 조회 실패:', error)
      }
    }

    // BOGO 프로모션 종료 시 장바구니를 일반 상품으로 정리
    let normalized = false
    const normalItemByProductId = new Map<string, any>()
    ;(data || []).forEach((item: any) => {
      if (!item.promotion_group_id) {
        normalItemByProductId.set(item.product_id, item)
      }
    })

    const cleanupTasks: Promise<any>[] = []
    for (const item of data || []) {
      if (!item.promotion_group_id) continue

      const product = Array.isArray(item.products) ? item.products[0] : item.products
      const promotion = extractActivePromotion(product)
      const isActiveBogo = promotion?.is_active && promotion?.type === 'bogo' && promotion?.buy_qty

      if (!isActiveBogo) {
        normalized = true
        const normalItem = normalItemByProductId.get(item.product_id)
        if (normalItem && normalItem.id !== item.id) {
          cleanupTasks.push(
            Promise.resolve(
              supabase
                .from('carts')
                .update({ quantity: (normalItem.quantity || 0) + (item.quantity || 0) })
                .eq('id', normalItem.id)
            )
          )
          cleanupTasks.push(
            Promise.resolve(
              supabase
                .from('carts')
                .delete()
                .eq('id', item.id)
            )
          )
        } else {
          cleanupTasks.push(
            Promise.resolve(
              supabase
                .from('carts')
                .update({
                  promotion_group_id: null,
                  promotion_type: null,
                  discount_percent: null,
                })
                .eq('id', item.id)
            )
          )
        }
      }
    }

    if (cleanupTasks.length > 0) {
      await Promise.allSettled(cleanupTasks)
      if (normalized) {
        const refetch = await fetchCartRows()
        if (!refetch.error && refetch.data) {
          // reassign after cleanup
          data.splice(0, data.length, ...(refetch.data as any))
        }
      }
    }

    const bogoFreeCountByGroup = new Map<string, Map<string, number>>()
    for (const item of data || []) {
      if (!item.promotion_group_id) continue
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      const promotion = extractActivePromotion(product)
      const isActiveBogo = promotion?.is_active && promotion?.type === 'bogo' && promotion?.buy_qty
      if (!isActiveBogo) continue

      const groupId = item.promotion_group_id
      if (!bogoFreeCountByGroup.has(groupId)) {
        const groupItems = (data || []).filter((row: any) => row.promotion_group_id === groupId)
        const unitEntries: Array<{ productId: string; price: number }> = []
        groupItems.forEach((row: any) => {
          const rowProduct = Array.isArray(row.products) ? row.products[0] : row.products
          const unitPrice = rowProduct?.price || 0
          const qty = row.quantity || 0
          for (let i = 0; i < qty; i += 1) {
            unitEntries.push({ productId: row.product_id, price: unitPrice })
          }
        })

        const buyQty = promotion.buy_qty || 1
        const freeCount = Math.floor(unitEntries.length / (buyQty + 1))
        unitEntries.sort((a, b) => a.price - b.price)
        const freeUnits = unitEntries.slice(0, freeCount)

        const freeCountByProduct = new Map<string, number>()
        freeUnits.forEach((unit) => {
          freeCountByProduct.set(unit.productId, (freeCountByProduct.get(unit.productId) || 0) + 1)
        })

        bogoFreeCountByGroup.set(groupId, freeCountByProduct)
      }
    }

    // localStorage 형식과 호환되도록 변환 (deleted 상태 제외)
    const items = (data || [])
      .filter((item: any) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        return product && product.status !== 'deleted'
      })
      .map((item: any) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
      
        // 프로모션 정보 추출
        const promotion = extractActivePromotion(product)

        // 할인율 결정
        let discountPercent = 0
        if (item.promotion_group_id) {
          const freeCountByProduct = bogoFreeCountByGroup.get(item.promotion_group_id)
          const freeCount = freeCountByProduct?.get(item.product_id) || 0
          const qty = item.quantity || 0
          discountPercent = qty > 0 ? Math.round((freeCount / qty) * 100) : 0
        } else {
          const timedealDiscountPercent = timedealDiscountMap.get(item.product_id) || 0
          const pricing = getFinalPricing({
            basePrice: product?.price || 0,
            timedealDiscountPercent,
            promotion,
            weightGram: product?.weight_gram,
          })
          discountPercent = pricing.discountPercent || 0
        }
      
        // 프로모션 타입 결정
        let promotionType: string | undefined = undefined
        if (promotion?.is_active && promotion?.type === 'bogo' && promotion.buy_qty) {
          promotionType = `${promotion.buy_qty}+1`
        } else if (promotion?.is_active && promotion?.type === 'discount') {
          promotionType = 'discount'
        }
      
        return {
          id: item.id,
          productId: item.product_id,
          slug: product?.slug || null,
          name: product?.name || '',
          price: product?.price || 0,
          quantity: item.quantity,
          imageUrl: productImages[item.product_id] || '',
          discount_percent: discountPercent,
          brand: product?.brand,
          promotion_type: promotionType,
          promotion_group_id: item.promotion_group_id,
          selected: true, // 기본값
          status: product?.status || 'active'
        }
      })

    return NextResponse.json({ 
      success: true, 
      items
    })
  } catch (error) {
    console.error('장바구니 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 장바구니에 상품 추가
export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { 
      product_id, 
      quantity, 
      promotion_type, 
      promotion_group_id,
      discount_percent 
    } = await request.json()

    if (!product_id || !quantity) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 })
    }

    // 프로모션 그룹이 있으면 항상 새로 추가
    if (promotion_group_id) {
      const { data, error } = await supabase
        .from('carts')
        .insert({
          user_id: user.id,
          product_id,
          quantity,
          promotion_type,
          promotion_group_id,
          discount_percent
        })
        .select()
        .single()

      if (error) {
        console.error('장바구니 추가 실패:', error)
        return NextResponse.json({ error: '장바구니 추가 실패' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: '장바구니에 추가되었습니다.',
        data 
      })
    }

    // 일반 상품: 기존 상품이 있으면 수량 증가
    const { data: existing } = await supabase
      .from('carts')
      .select()
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .is('promotion_group_id', null)
      .single()

    if (existing) {
      // 기존 상품 수량 증가
      const { data, error } = await supabase
        .from('carts')
        .update({ 
          quantity: existing.quantity + quantity,
          discount_percent: discount_percent ?? existing.discount_percent
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('장바구니 수량 업데이트 실패:', error)
        return NextResponse.json({ error: '장바구니 수량 업데이트 실패' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: '장바구니에 추가되었습니다.',
        data,
        updated: true
      })
    }

    // 새 상품 추가
    const { data, error } = await supabase
      .from('carts')
      .insert({
        user_id: user.id,
        product_id,
        quantity,
        discount_percent
      })
      .select()
      .single()

    if (error) {
      console.error('장바구니 추가 실패:', error)
      return NextResponse.json({ error: '장바구니 추가 실패' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '장바구니에 추가되었습니다.',
      data 
    })
  } catch (error) {
    console.error('장바구니 추가 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PATCH: 장바구니 상품 수량 수정
export async function PATCH(request: Request) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { id, quantity } = await request.json()

    if (!id || !quantity) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 })
    }

    // 수량 업데이트
    const { data, error } = await supabase
      .from('carts')
      .update({ quantity })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('장바구니 수량 수정 실패:', error)
      return NextResponse.json({ error: '장바구니 수량 수정 실패' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '수량이 수정되었습니다.',
      data 
    })
  } catch (error) {
    console.error('장바구니 수량 수정 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 장바구니에서 상품 제거
export async function DELETE(request: Request) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { id, promotion_group_id } = await request.json()

    if (!id && !promotion_group_id) {
      return NextResponse.json({ error: '삭제할 항목의 ID가 필요합니다.' }, { status: 400 })
    }

    // 프로모션 그룹이 있으면 같은 그룹의 모든 상품 삭제
    if (promotion_group_id) {
      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('user_id', user.id)
        .eq('promotion_group_id', promotion_group_id)

      if (error) {
        console.error('장바구니 제거 실패:', error)
        return NextResponse.json({ error: '장바구니 제거 실패' }, { status: 500 })
      }
    } else {
      // 일반 상품 제거
      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('장바구니 제거 실패:', error)
        return NextResponse.json({ error: '장바구니 제거 실패' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: '장바구니에서 제거되었습니다.' 
    })
  } catch (error) {
    console.error('장바구니 제거 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

