'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { OrderWithItems } from '@/lib/order/order-types'
import { showSuccess } from '@/lib/utils/error-handler'
import { initKakaoSDK } from '@/lib/order/gift/initKakao'

interface GiftShareBoxProps {
  giftToken: string
  giftOrder: OrderWithItems | null
}

export default function GiftShareBox({ giftToken, giftOrder }: GiftShareBoxProps) {
  const [copied, setCopied] = useState(false)

  const giftLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/gift/receive/${giftToken}`
    : ''

  const handleCopyLink = async () => {
    const copyToClipboard = async (text: string): Promise<boolean> => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text)
          return true
        } catch (err) {
          // Clipboard API 실패 시 다음 방법 시도
        }
      }
      
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (successful) {
          return true
        }
      } catch (err) {
        // execCommand도 실패
      }
      
      return false
    }
    
    try {
      const success = await copyToClipboard(giftLink)
      if (success) {
        setCopied(true)
        showSuccess('링크가 복사되었습니다!', { icon: '📋' })
        setTimeout(() => setCopied(false), 2000)
      } else {
        toast.error('자동 복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.', {
          icon: '📋',
          duration: 5000,
        })
      }
    } catch (error) {
      toast.error('링크 복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.', {
        icon: '📋',
        duration: 5000,
      })
    }
  }

  const handleKakaoShare = async () => {
    if (!giftOrder?.gift_token) return

    try {
      // 모바일 환경 확인
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // PC 환경에서는 링크 복사
      if (!isMobile) {
        const copySuccess = await navigator.clipboard.writeText(giftLink).then(() => true).catch(() => false)
        if (copySuccess) {
          toast.success(
            'PC에서는 카카오톡 공유가 불가능합니다.\n선물 링크가 클립보드에 복사되었습니다.\n모바일로 링크를 보내거나, 모바일에서 다시 시도해주세요.',
            {
              icon: '📱',
              duration: 8000,
            }
          )
        } else {
          toast.error('링크 복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.', {
            icon: '📋',
            duration: 5000,
          })
        }
        return
      }

      // 카카오톡 SDK 초기화
      initKakaoSDK()
      
      // SDK 로드 대기
      await new Promise(resolve => setTimeout(resolve, 500))

      if (!window.Kakao) {
        throw new Error('카카오톡 SDK가 로드되지 않았습니다.')
      }

      if (!window.Kakao.isInitialized()) {
        const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || ''
        if (!kakaoAppKey) {
          throw new Error('카카오톡 앱 키가 설정되지 않았습니다.')
        }
        window.Kakao.init(kakaoAppKey)
        await new Promise(resolve => setTimeout(resolve, 200))
        
        if (!window.Kakao.isInitialized()) {
          throw new Error('카카오톡 SDK 초기화에 실패했습니다.')
        }
      }

      if (!window.Kakao.Share) {
        throw new Error('카카오톡 Share API를 사용할 수 없습니다.')
      }

      // 선물 카드 디자인과 메시지 가져오기
      const cardDesign = giftOrder.gift_card_design || null
      const giftMessage = giftOrder.gift_message || null

      // 카드 디자인별 제목 설정
      const getCardTitle = (design: string | null | undefined) => {
        if (design?.startsWith('birthday')) {
          return '🎂 생일 축하 선물이 도착했습니다!'
        } else if (design?.startsWith('thanks')) {
          return '🙏 감사 인사 선물이 도착했습니다!'
        } else if (design?.startsWith('celebration')) {
          return '🎉 축하 선물이 도착했습니다!'
        }
        return '🎁 선물이 도착했습니다!'
      }

      const title = getCardTitle(cardDesign)

      // 메시지가 있으면 합성 이미지 생성, 없으면 원본 이미지 사용
      let cardImageUrl: string
      if (giftMessage && cardDesign) {
        try {
          const { createGiftCardImage } = await import('@/lib/order/gift/gift-utils')
          const dataUrl = await createGiftCardImage({
            message: giftMessage,
            cardDesign: cardDesign,
            items: giftOrder.order_items?.map(item => ({
              imageUrl: item.product?.image_url || undefined,
            })) || [],
          })
          
          // 서버에 업로드하여 공개 URL 생성
          try {
            const uploadResponse = await fetch('/api/gift/upload-card-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ imageData: dataUrl }),
            })
            
            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json()
              cardImageUrl = uploadData.url
            } else {
              cardImageUrl = cardDesign 
                ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
                : `${window.location.origin}/images/gift-default.jpg`
            }
          } catch (uploadError) {
            cardImageUrl = cardDesign 
              ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
              : `${window.location.origin}/images/gift-default.jpg`
          }
        } catch (imageError) {
          console.error('이미지 생성 실패:', imageError)
          cardImageUrl = cardDesign 
            ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
            : `${window.location.origin}/images/gift-default.jpg`
        }
      } else {
        cardImageUrl = cardDesign 
          ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
          : `${window.location.origin}/images/gift-default.jpg`
      }

      // 카카오톡 공유 실행
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: giftMessage || '선물을 받아보세요!',
          imageUrl: cardImageUrl,
          link: {
            mobileWebUrl: giftLink,
            webUrl: giftLink,
          },
        },
        buttons: [
          {
            title: '선물 받기',
            link: {
              mobileWebUrl: giftLink,
              webUrl: giftLink,
            },
          },
        ],
      })
    } catch (error: any) {
      // 카카오톡 공유 실패 시 링크 복사로 대체
      try {
        await navigator.clipboard.writeText(giftLink)
        toast.success(
          '카카오톡 공유에 실패했습니다. 선물 링크가 클립보드에 복사되었습니다.\n링크를 카카오톡으로 직접 보내주세요.',
          {
            icon: '📋',
            duration: 8000,
          }
        )
      } catch (clipboardError) {
        toast.error(
          `카카오톡 공유에 실패했습니다. 아래 링크를 복사해서 보내주세요:\n${giftLink}`,
          {
            icon: '❌',
            duration: 10000,
          }
        )
      }
    }
  }

  return (
    <div className="mb-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 mb-2">선물 링크가 생성되었습니다!</h3>
          <p className="text-sm text-gray-600 mb-3">
            아래 링크를 카카오톡으로 보내면 받는 분이 주소를 입력할 수 있습니다.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              readOnly
              value={giftLink}
              className="flex-1 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition text-sm font-medium whitespace-nowrap flex-shrink-0"
            >
              {copied ? '복사됨!' : '복사'}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleKakaoShare}
              className="flex-1 px-4 py-2 bg-yellow-300 text-gray-900 rounded-lg hover:bg-yellow-400 transition text-sm font-medium"
            >
              카카오톡으로 보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

