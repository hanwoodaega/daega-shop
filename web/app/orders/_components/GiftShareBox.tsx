'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { OrderWithItems } from '@/lib/order/order-types'
import { showSuccess } from '@/lib/utils/error-handler'

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
        showSuccess('링크가 복사되었습니다!')
        setTimeout(() => setCopied(false), 2000)
      } else {
        toast.error('자동 복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.', {
          duration: 3000,
        })
      }
    } catch (error) {
      toast.error('링크 복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.', {
        duration: 3000,
      })
    }
  }

  return (
    <div className="mb-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 mb-2">선물 링크 생성!</h3>
          <p className="text-sm text-gray-600 mb-3">
            받는 분께 카카오톡으로 전송되었습니다. 아래 링크를 복사해 추가로 전달할 수 있습니다.
          </p>
          <div className="flex items-center gap-2">
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
        </div>
      </div>
    </div>
  )
}

