'use client'

import { useRouter } from 'next/navigation'
import { NotificationItem } from '@/lib/notification'

interface NotificationsListProps {
  notifications: NotificationItem[]
}

export default function NotificationsList({ notifications }: NotificationsListProps) {
  const router = useRouter()

  if (notifications.length === 0) return null

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border ${
            notification.is_read 
              ? 'bg-white border-gray-200' 
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                {notification.title}
              </h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                {renderContent(notification, router)}
              </div>
              <p className="text-xs text-gray-500">
                {new Date(notification.created_at).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function renderContent(notification: NotificationItem, router: ReturnType<typeof useRouter>) {
  const content = notification.content

  const makeLink = (label: string, href: string) => (
    <button
      onClick={() => router.push(href)}
      className="text-blue-600 hover:text-red-600 underline font-medium"
    >
      {label}
    </button>
  )

  if (notification.type === 'general' && content.includes('구매확정하기')) {
    return content.split('구매확정하기').map((part, idx, arr) =>
      idx === arr.length - 1 ? (
        <span key={idx}>{part}</span>
      ) : (
        <span key={idx}>
          {part}
          {makeLink('구매확정하기', '/orders')}
        </span>
      )
    )
  }

  if (notification.type === 'general' && content.includes('리뷰 작성하기')) {
    return content.split('리뷰 작성하기').map((part, idx, arr) =>
      idx === arr.length - 1 ? (
        <span key={idx}>{part}</span>
      ) : (
        <span key={idx}>
          {part}
          {makeLink('리뷰 작성하기', '/profile/reviews')}
        </span>
      )
    )
  }

  if (notification.type === 'general' && content.includes('쿠폰함 가기')) {
    return content.split('쿠폰함 가기').map((part, idx, arr) =>
      idx === arr.length - 1 ? (
        <span key={idx}>{part}</span>
      ) : (
        <span key={idx}>
          {part}
          {makeLink('쿠폰함 가기', '/profile/coupons')}
        </span>
      )
    )
  }

  return content
}


