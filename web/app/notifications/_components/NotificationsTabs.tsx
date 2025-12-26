'use client'

type Tab = 'general' | 'earned'

interface NotificationsTabsProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  unreadCountGeneral: number
  unreadCountEarned: number
}

export default function NotificationsTabs({
  activeTab,
  setActiveTab,
  unreadCountGeneral,
  unreadCountEarned,
}: NotificationsTabsProps) {
  return (
    <div className="flex mb-6 border-b border-gray-200">
      <button
        onClick={() => setActiveTab('general')}
        className={`flex-1 px-4 py-2 font-medium text-sm relative text-center ${
          activeTab === 'general'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        일반
        {unreadCountGeneral > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
            {unreadCountGeneral}
          </span>
        )}
      </button>
      <button
        onClick={() => setActiveTab('earned')}
        className={`flex-1 px-4 py-2 font-medium text-sm relative text-center ${
          activeTab === 'earned'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        적립
        {unreadCountEarned > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
            {unreadCountEarned}
          </span>
        )}
      </button>
    </div>
  )
}


