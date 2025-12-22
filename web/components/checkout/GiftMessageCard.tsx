'use client'

interface GiftMessageCardProps {
  giftData: {
    message: string
    cardDesign: string
    withMessage: boolean
  }
  onWithMessageChange: (withMessage: boolean) => void
  onCardDesignChange: (design: string) => void
  onMessageChange: (message: string) => void
}

export function GiftMessageCard({
  giftData,
  onWithMessageChange,
  onCardDesignChange,
  onMessageChange,
}: GiftMessageCardProps) {
  const getMessageStyle = (cardDesign: string) => {
    const styles: Record<string, {
      fontSize: string;
      color: string;
      fontFamily: string;
      fontWeight: string;
      textShadow: string;
      lineHeight: string;
    }> = {
      'birthday-1': {
        fontSize: 'clamp(16px, 3vw, 22px)',
        color: '#000000',
        fontFamily: "'S-CoreDream', 'S-Core Dream', 'Noto Sans KR', sans-serif",
        fontWeight: '500',
        textShadow: 'none',
        lineHeight: '1.5',
      },
      'thanks-1': {
        fontSize: 'clamp(15px, 2.8vw, 20px)',
        color: '#000000',
        fontFamily: "'S-CoreDream', 'S-Core Dream', 'Noto Sans KR', sans-serif",
        fontWeight: '500',
        textShadow: 'none',
        lineHeight: '1.7',
      },
      'thanks-2': {
        fontSize: 'clamp(14px, 2.5vw, 19px)',
        color: '#000000',
        fontFamily: "'S-CoreDream', 'S-Core Dream', 'Noto Sans KR', sans-serif",
        fontWeight: '500',
        textShadow: 'none',
        lineHeight: '1.6',
      },
      'celebration-1': {
        fontSize: 'clamp(17px, 3.2vw, 24px)',
        color: '#000000',
        fontFamily: "'S-CoreDream', 'S-Core Dream', 'Noto Sans KR', sans-serif",
        fontWeight: '500',
        textShadow: 'none',
        lineHeight: '1.4',
      },
      'celebration-2': {
        fontSize: 'clamp(16px, 3vw, 21px)',
        color: '#000000',
        fontFamily: "'S-CoreDream', 'S-Core Dream', 'Noto Sans KR', sans-serif",
        fontWeight: '500',
        textShadow: 'none',
        lineHeight: '1.5',
      },
    }
    return styles[cardDesign] || {
      fontSize: 'clamp(14px, 2.5vw, 18px)',
      color: '#000000',
      fontFamily: "'S-CoreDream', 'S-Core Dream', 'Noto Sans KR', sans-serif",
      fontWeight: '500',
      textShadow: 'none',
      lineHeight: '1.6',
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">메시지 카드 보내기</h2>
      </div>
      
      <div className="flex gap-6 mb-6">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="messageOption"
            checked={!giftData.withMessage}
            onChange={() => onWithMessageChange(false)}
            className="w-3 h-3 text-red-600 border-gray-300 focus:ring-red-500"
          />
          <span className="text-base">메시지 없이 보내기</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="messageOption"
            checked={giftData.withMessage}
            onChange={() => onWithMessageChange(true)}
            className="w-3 h-3 text-red-600 border-gray-300 focus:ring-red-500"
          />
          <span className="text-base">메시지 함께 보내기</span>
        </label>
      </div>

      {giftData.withMessage && (
        <div className="space-y-4 mb-20">
          <div>
            <label className="block text-sm font-medium mb-3">
              카드 디자인 선택
            </label>
            <div className="overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              <div className="flex gap-3 min-w-max">
                {[
                  { value: 'birthday-1', label: '생일 축하', emoji: '🎂', color: 'from-pink-200 to-pink-300' },
                  { value: 'thanks-1', label: '감사 인사 1', emoji: '🙏', color: 'from-blue-200 to-blue-300' },
                  { value: 'thanks-2', label: '감사 인사 2', emoji: '🙏', color: 'from-blue-200 to-blue-300' },
                  { value: 'celebration-1', label: '축하 1', emoji: '🎉', color: 'from-orange-200 to-orange-300' },
                  { value: 'celebration-2', label: '축하 2', emoji: '🎉', color: 'from-orange-200 to-orange-300' },
                ].map((design) => (
                  <button
                    key={design.value}
                    type="button"
                    onClick={() => onCardDesignChange(design.value)}
                    className={`relative flex-shrink-0 w-32 rounded-lg border-2 transition-all ${
                      giftData.cardDesign === design.value
                        ? 'border-primary-600 ring-2 ring-primary-300 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={`/images/gift-cards/${design.value}.png`}
                        alt={design.label}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement!
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                              <span class="text-gray-400 text-2xl">${design.emoji}</span>
                            </div>
                          `
                        }}
                      />
                      {giftData.cardDesign === design.value && (
                        <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-white">
                      <p className="text-xs font-medium text-center text-gray-700">{design.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {giftData.cardDesign && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                카드 미리보기
              </label>
              <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 shadow-md" style={{ aspectRatio: '1/1' }}>
                <img
                  src={`/images/gift-cards/${giftData.cardDesign}.png`}
                  alt="카드 디자인"
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement!
                    if (!parent.querySelector('.error-fallback')) {
                      const errorDiv = document.createElement('div')
                      errorDiv.className = 'error-fallback w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200'
                      errorDiv.innerHTML = '<span class="text-gray-400">카드 이미지를 추가해주세요</span>'
                      parent.appendChild(errorDiv)
                    }
                  }}
                />
                {giftData.message && (() => {
                  const messageStyle = getMessageStyle(giftData.cardDesign)
                  const paddingClass = giftData.cardDesign === 'thanks-2' ? 'px-16' : 'px-12'
                  
                  return (
                    <div className={`absolute left-0 right-0 ${paddingClass} pointer-events-none z-10`} style={{ 
                      top: '40%',
                      height: '50%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                    }}>
                      <p className="text-left whitespace-pre-wrap break-words w-full" style={{ 
                        fontSize: messageStyle.fontSize,
                        color: messageStyle.color,
                        fontFamily: messageStyle.fontFamily,
                        fontWeight: messageStyle.fontWeight,
                        textShadow: messageStyle.textShadow,
                        lineHeight: messageStyle.lineHeight,
                      }}>
                        {giftData.message}
                      </p>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">
              선물 메시지
            </label>
            <textarea
              value={giftData.message}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={4}
              maxLength={150}
              placeholder="받는 분께 전달할 메시지를 작성해주세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">{giftData.message.length}/150</p>
          </div>
        </div>
      )}
    </div>
  )
}

