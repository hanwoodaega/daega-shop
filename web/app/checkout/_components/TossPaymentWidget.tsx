'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { getTossPayments } from '@/lib/payments/toss-payments-loader'
import { showError } from '@/lib/utils/error-handler'

interface TossPaymentWidgetProps {
  amount: number
  customerKey: string
  onWidgetsReady: (widgets: any) => void
  variantKey?: string
}

export default function TossPaymentWidget({
  amount,
  customerKey,
  onWidgetsReady,
  variantKey = 'DEFAULT',
}: TossPaymentWidgetProps) {
  const [widgets, setWidgets] = useState<any>(null)
  const paymentRef = useRef<HTMLDivElement | null>(null)
  const agreementRef = useRef<HTMLDivElement | null>(null)
  const renderedRef = useRef(false)
  const paymentWidgetRef = useRef<any>(null)
  const agreementWidgetRef = useRef<any>(null)

  const reactId = useId()
  const safeId = reactId.replace(/:/g, '')
  const paymentMethodId = `payment-method-${safeId}`
  const agreementId = `agreement-${safeId}`

  useEffect(() => {
    let cancelled = false

    const initWidgets = async () => {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      if (!clientKey) return

      const safeCustomerKey =
        customerKey && /^[a-zA-Z0-9\\-_=.@]{2,50}$/.test(customerKey)
          ? customerKey
          : 'guest'

      try {
        const tossPayments = await getTossPayments(clientKey)
        if (cancelled) return

        const created = tossPayments.widgets({ customerKey: safeCustomerKey })
        if (cancelled) return

        onWidgetsReady(created)
        setWidgets(created)
      } catch (error: any) {
        if (cancelled) return
        console.error('결제 위젯 초기화 실패:', error)
        showError({ message: error?.message || '결제 위젯을 불러오지 못했습니다.' })
      }
    }

    initWidgets()

    return () => {
      cancelled = true
      paymentWidgetRef.current?.destroy?.()
      agreementWidgetRef.current?.destroy?.()
      paymentWidgetRef.current = null
      agreementWidgetRef.current = null
      renderedRef.current = false
    }
  }, [customerKey, onWidgetsReady])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!widgets || renderedRef.current) return

      const value = Math.max(0, amount)
      if (value <= 0) return

      const selectorPayment = `#${paymentMethodId}`
      const selectorAgreement = `#${agreementId}`

      if (!document.querySelector(selectorPayment) || !document.querySelector(selectorAgreement)) return

      try {
        await widgets.setAmount({ currency: 'KRW', value })
        if (cancelled) return

        paymentWidgetRef.current = await widgets.renderPaymentMethods({
          selector: selectorPayment,
          variantKey,
        })
        if (cancelled) return

        agreementWidgetRef.current = await widgets.renderAgreement({
          selector: selectorAgreement,
        })
        if (cancelled) return

        renderedRef.current = true
      } catch (error: any) {
        if (cancelled) return
        console.error('결제 위젯 렌더 실패:', error)
        showError({ message: error?.message || '결제 위젯을 불러오지 못했습니다.' })
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [widgets, amount, variantKey, paymentMethodId, agreementId])

  return (
    <div>
      <div ref={paymentRef} id={paymentMethodId} />
      <div ref={agreementRef} id={agreementId} className="mt-4" />
    </div>
  )
}