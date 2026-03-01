'use client'

import { useEffect, useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { showError } from '@/lib/utils/error-handler'

interface TossPaymentWidgetProps {
  amount: number
  customerKey: string
  onWidgetsReady: (widgets: any) => void
}

export default function TossPaymentWidget({
  amount,
  customerKey,
  onWidgetsReady,
}: TossPaymentWidgetProps) {
  const [widgets, setWidgets] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const initWidgets = async () => {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      if (!clientKey) return

      try {
        const tossPayments = await loadTossPayments(clientKey)
        if (cancelled) return
        const created = tossPayments.widgets({ customerKey })
        onWidgetsReady(created)
        setWidgets(created)
      } catch (error: any) {
        console.error('결제 위젯 초기화 실패:', error)
        showError({ message: '결제 위젯을 불러오지 못했습니다.' }, { icon: '⚠️' })
      }
    }

    initWidgets()

    return () => {
      cancelled = true
    }
  }, [customerKey, onWidgetsReady])

  useEffect(() => {
    const renderWidgets = async () => {
      if (!widgets) return

      try {
        await widgets.setAmount({
          currency: 'KRW',
          value: Math.max(0, amount),
        })

        await Promise.all([
          widgets.renderPaymentMethods({
            selector: '#payment-method',
            variantKey: 'DEFAULT',
          }),
          widgets.renderAgreement({
            selector: '#agreement',
            variantKey: 'AGREEMENT',
          }),
        ])
      } catch (error: any) {
        console.error('결제 위젯 초기화 실패:', error)
        showError({ message: '결제 위젯을 불러오지 못했습니다.' }, { icon: '⚠️' })
      }
    }

    renderWidgets()
  }, [amount, widgets])

  return (
    <div>
      <div id="payment-method" />
      <div className="mt-4" id="agreement" />
    </div>
  )
}
