import toast from 'react-hot-toast'
import { createGiftCardImage } from './gift-utils'

export interface KakaoShareOptions {
  orderId: string
  giftToken: string
  cardDesign: string
  message: string
  items: Array<{ imageUrl?: string }>
}

export async function performKakaoShare(options: KakaoShareOptions): Promise<void> {
  const { orderId, giftToken, cardDesign, message, items } = options
  const giftLink = `${window.location.origin}/gift/receive/${giftToken}`
  
  // 카드 디자인에 따른 제목 설정
  const getCardTitle = (cardDesign: string) => {
    if (cardDesign.startsWith('birthday')) {
      return '🎂 생일 축하 선물이 도착했습니다!'
    } else if (cardDesign.startsWith('thanks')) {
      return '🙏 감사 인사 선물이 도착했습니다!'
    } else if (cardDesign.startsWith('celebration')) {
      return '🎉 축하 선물이 도착했습니다!'
    }
    return '🎁 선물이 도착했습니다!'
  }
  
  const title = getCardTitle(cardDesign)

  try {
    // 메시지가 있으면 합성 이미지 생성, 없으면 원본 이미지 사용
    let cardImageUrl: string
    if (message && cardDesign) {
      try {
        // 합성 이미지 생성
        const dataUrl = await createGiftCardImage({ message, cardDesign, items })
        
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
            // 업로드 실패 시 원본 이미지 사용
            cardImageUrl = cardDesign 
              ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
              : items[0]?.imageUrl || `${window.location.origin}/images/gift-default.jpg`
          }
        } catch (uploadError) {
          // 업로드 에러 시 원본 이미지 사용
          cardImageUrl = cardDesign 
            ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
            : items[0]?.imageUrl || `${window.location.origin}/images/gift-default.jpg`
        }
      } catch (imageError) {
        // 이미지 생성 실패 시 원본 이미지 사용
        console.error('이미지 생성 실패:', imageError)
        cardImageUrl = cardDesign 
          ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
          : items[0]?.imageUrl || `${window.location.origin}/images/gift-default.jpg`
      }
    } else {
      // 원본 카드 이미지 사용
      cardImageUrl = cardDesign 
        ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
        : items[0]?.imageUrl || `${window.location.origin}/images/gift-default.jpg`
    }

    if (!window.Kakao || !window.Kakao.isInitialized()) {
      throw new Error('카카오 SDK가 초기화되지 않았습니다.')
    }

    await window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: title,
        description: '선물을 받아보세요!',
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
      serverCallbackArgs: {
        orderId: orderId,
        giftToken: giftToken,
      },
    })
  } catch (error: any) {
    throw new Error(`카카오톡 공유 실패: ${error.message || '알 수 없는 오류'}`)
  }
}

export async function shareGiftToKakao(options: KakaoShareOptions): Promise<void> {
  try {
    await performKakaoShare(options)
  } catch (error: any) {
    const shareUrl = `${window.location.origin}/gift/receive/${options.giftToken}`
    const isKakaoLinkError = error.message?.includes('kakaolink://') || 
                             error.message?.includes('scheme does not have a registered handler')
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success(
        isKakaoLinkError
          ? `PC에서는 카카오톡 앱이 없어 공유할 수 없습니다.\n선물 링크가 클립보드에 복사되었습니다.\n모바일로 링크를 보내거나, 모바일에서 다시 시도해주세요.`
          : `카카오톡 공유에 실패했습니다. 선물 링크가 클립보드에 복사되었습니다.\n링크를 카카오톡으로 직접 보내주세요.`,
        {
          icon: isKakaoLinkError ? '📱' : '📋',
          duration: 8000,
        }
      )
    } catch (clipboardError) {
      toast.error(
        `카카오톡 공유에 실패했습니다. 아래 링크를 복사해서 보내주세요:\n${shareUrl}`,
        {
          icon: '❌',
          duration: 10000,
        }
      )
    }
  }
}

