'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/supabase'
import { Product } from '@/lib/supabase/supabase'

export interface ProductImage {
  id: string
  image_url: string
  priority: number
}

export interface UseProductImagesReturn {
  images: ProductImage[]
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  handlePrevious: () => void
  handleNext: () => void
  handleSwipe: (direction: 'left' | 'right') => void
}

export function useProductImages(
  product: Product | null,
  initialImages?: ProductImage[]
): UseProductImagesReturn {
  const [images, setImages] = useState<ProductImage[]>(initialImages ?? [])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const initialProductIdRef = useRef<string | null>(product?.id ?? null)
  const initialImagesRef = useRef<ProductImage[] | undefined>(initialImages)

  useEffect(() => {
    if (!product?.id) {
      setImages([])
      return
    }

    const shouldUseInitial =
      initialImagesRef.current &&
      initialProductIdRef.current === product.id

    if (shouldUseInitial) {
      setImages(initialImagesRef.current || [])
      return
    }

    // 상품 이미지 목록 불러오기
    supabase
      .from('product_images')
      .select('id, image_url, priority')
      .eq('product_id', product.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }: { data: ProductImage[] | null; error: any }) => {
        if (!error && data && data.length > 0) {
          setImages(data)
          // 첫 번째 이미지를 product.image_url로 설정
          if (product && !product.image_url) {
            // 이미지는 state로만 관리하고 product 객체는 직접 수정하지 않음
          }
        } else {
          setImages([])
        }
      })
      .catch(() => {
        setImages([])
      })
  }, [product?.id])

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const handleNext = () => {
    if (selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    } else if (direction === 'right' && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  return {
    images,
    selectedIndex,
    setSelectedIndex,
    handlePrevious,
    handleNext,
    handleSwipe,
  }
}

