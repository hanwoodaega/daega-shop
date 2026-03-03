import { extractActivePromotion } from '@/lib/product/product.service'
import { getFinalPricing } from '@/lib/product/product.pricing'

export async function fetchCartItemsForUser(supabase: any, userId: string) {
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
          weight_gram,
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
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
  }

  const { data, error } = await fetchCartRows()
  if (error) {
    throw error
  }

  const productIds = (data || []).map((item: any) => item.product_id).filter(Boolean)
  let productImages: { [key: string]: string | null } = {}

  if (productIds.length > 0) {
    const { data: imagesData } = await supabase
      .from('product_images')
      .select('product_id, image_url, priority, created_at')
      .in('product_id', productIds)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (imagesData) {
      const imageMap = new Map<string, { image_url: string; priority: number | null; created_at: string | null }>()
      imagesData.forEach((img: any) => {
        if (!img?.product_id) return
        if (!imageMap.has(img.product_id)) {
          imageMap.set(img.product_id, {
            image_url: img.image_url,
            priority: img.priority ?? null,
            created_at: img.created_at ?? null,
          })
        }
      })
      productImages = Array.from(imageMap.entries()).reduce((acc, [productId, img]) => {
        acc[productId] = img.image_url || null
        return acc
      }, {} as { [key: string]: string | null })
    }
  }

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
        data.splice(0, data.length, ...(refetch.data as any))
      }
    }
  }

  const filtered = (data || []).filter((item: any) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products
    return product && product.status !== 'deleted'
  })

  const byKey = new Map<string, any>()
  for (const item of filtered) {
    const key = `${item.product_id}::${item.promotion_group_id ?? ''}`
    const existing = byKey.get(key)
    if (existing) {
      existing.quantity = (existing.quantity || 0) + (item.quantity || 0)
    } else {
      byKey.set(key, { ...item })
    }
  }
  const mergedRows = Array.from(byKey.values())

  const bogoFreeCountByGroup = new Map<string, Map<string, number>>()
  for (const item of mergedRows) {
    if (!item.promotion_group_id) continue
    const product = Array.isArray(item.products) ? item.products[0] : item.products
    const promotion = extractActivePromotion(product)
    const isActiveBogo = promotion?.is_active && promotion?.type === 'bogo' && promotion?.buy_qty
    if (!isActiveBogo) continue

    const groupId = item.promotion_group_id
    if (!bogoFreeCountByGroup.has(groupId)) {
      const groupItems = mergedRows.filter((row: any) => row.promotion_group_id === groupId)
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

  const items = mergedRows.map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      const promotion = extractActivePromotion(product)

      let discountPercent = 0
      if (item.promotion_group_id) {
        const freeCountByProduct = bogoFreeCountByGroup.get(item.promotion_group_id)
        const freeCount = freeCountByProduct?.get(item.product_id) || 0
        const qty = item.quantity || 0
        discountPercent = qty > 0 ? Math.round((freeCount / qty) * 100) : 0
      } else {
        const pricing = getFinalPricing({
          basePrice: product?.price || 0,
          promotion,
          weightGram: product?.weight_gram,
        })
        discountPercent = pricing.discountPercent || 0
      }

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
        weightGram: product?.weight_gram || null,
        quantity: item.quantity,
        imageUrl: productImages[item.product_id] || null,
        discount_percent: discountPercent,
        brand: product?.brand,
        promotion_type: promotionType,
        promotion_group_id: item.promotion_group_id,
        selected: true,
        status: product?.status || 'active',
      }
    })

  return items
}
