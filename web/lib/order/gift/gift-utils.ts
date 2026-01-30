import { GiftCardImageOptions } from './gift-types'

export async function createGiftCardImage(options: GiftCardImageOptions): Promise<string> {
  const { message, cardDesign, items } = options

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas context를 가져올 수 없습니다.'))
      return
    }

    // 1080x1080 크기로 설정
    const size = 1080
    canvas.width = size
    canvas.height = size

    const cardImage = new Image()
    cardImage.crossOrigin = 'anonymous'
    
    cardImage.onload = () => {
      // 카드 이미지 그리기
      ctx.drawImage(cardImage, 0, 0, size, size)

      // 메시지가 있으면 텍스트 오버레이
      if (message) {
        // 카드 디자인별 메시지 스타일 가져오기
        const getMessageStyle = (cardDesign: string) => {
          const styles: Record<string, {
            fontSize: number;
            color: string;
            fontFamily: string;
            fontWeight: string;
            lineHeight: number;
          }> = {
            'birthday-1': {
              fontSize: 46,
              color: '#000000',
              fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
              fontWeight: '500',
              lineHeight: 1.6,
            },
            'thanks-1': {
              fontSize: 46,
              color: '#000000',
              fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
              fontWeight: '500',
              lineHeight: 1.7,
            },
            'thanks-2': {
              fontSize: 42,
              color: '#000000',
              fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
              fontWeight: '500',
              lineHeight: 1.7,
            },
            'celebration-1': {
              fontSize: 50,
              color: '#000000',
              fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
              fontWeight: '500',
              lineHeight: 1.5,
            },
            'celebration-2': {
              fontSize: 48,
              color: '#000000',
              fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
              fontWeight: '500',
              lineHeight: 1.4,
            },
          }
          return styles[cardDesign] || {
            fontSize: 34,
            color: '#000000',
            fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
            fontWeight: '500',
            lineHeight: 1.7,
          }
        }

        const messageStyle = getMessageStyle(cardDesign)
        
        // celebration-2는 왼쪽 정렬
        const isCelebration2 = cardDesign === 'celebration-2'
        const textAreaTop = isCelebration2 ? size * 0.39 : size * 0.37
        
        // 텍스트 스타일 설정
        ctx.fillStyle = messageStyle.color
        ctx.font = `${messageStyle.fontWeight} ${messageStyle.fontSize}px ${messageStyle.fontFamily}`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const textAreaHeight = size * 0.5
        
        // 패딩 계산
        let leftPadding: number
        let rightPadding: number
        if (cardDesign === 'thanks-2') {
          leftPadding = size * 0.18
          rightPadding = size * 0.15
        } else if (cardDesign === 'thanks-1' || cardDesign === 'celebration-1') {
          leftPadding = size * 0.15
          rightPadding = size * 0.15
        } else if (cardDesign === 'birthday-1') {
          leftPadding = size * 0.12
          rightPadding = size * 0.12
        } else if (isCelebration2) {
          leftPadding = size * 0.14
          rightPadding = size * 0.14
        } else {
          leftPadding = size * 0.1
          rightPadding = size * 0.1
        }
        const maxWidth = size - leftPadding - rightPadding

        // 텍스트 줄바꿈 처리
        const lines: string[] = []
        const messageLines = message.split('\n')
        
        for (const messageLine of messageLines) {
          if (!messageLine.trim()) {
            lines.push('')
            continue
          }
          
          let currentLine = ''
          const words = messageLine.split(/(\s+)/)
          
          for (const word of words) {
            if (!word.trim()) {
              if (currentLine) {
                currentLine += word
              }
              continue
            }
            
            const testLine = currentLine ? `${currentLine}${word}` : word
            const metrics = ctx.measureText(testLine)
            
            if (metrics.width > maxWidth) {
              if (currentLine) {
                lines.push(currentLine.trim())
                currentLine = word
              } else {
                // 한 단어가 너무 길면 문자 단위로 분할
                let charLine = ''
                for (const char of word) {
                  const testCharLine = charLine + char
                  const charMetrics = ctx.measureText(testCharLine)
                  if (charMetrics.width > maxWidth && charLine) {
                    lines.push(charLine)
                    charLine = char
                  } else {
                    charLine = testCharLine
                  }
                }
                if (charLine) {
                  currentLine = charLine
                }
              }
            } else {
              currentLine = testLine
            }
          }
          
          if (currentLine.trim()) {
            lines.push(currentLine.trim())
          }
        }

        // 텍스트 그리기
        const lineHeight = messageStyle.fontSize * messageStyle.lineHeight
        lines.forEach((line, index) => {
          const y = textAreaTop + (index * lineHeight)
          ctx.fillText(line, leftPadding, y)
        })
      }

      // Canvas를 이미지로 변환
      const dataUrl = canvas.toDataURL('image/png')
      resolve(dataUrl)
    }

    cardImage.onerror = () => {
      reject(new Error('카드 이미지를 로드할 수 없습니다.'))
    }

    // 카드 이미지 로드
    const cardImageUrl = cardDesign 
      ? `${window.location.origin}/images/gift-cards/${cardDesign}.jpg`
      : items[0]?.imageUrl || `${window.location.origin}/images/gift-default.jpg`
    
    cardImage.src = cardImageUrl
  })
}

