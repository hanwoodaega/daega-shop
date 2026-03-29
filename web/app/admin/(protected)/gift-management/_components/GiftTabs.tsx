import { TabType } from '../_types'

interface GiftTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function GiftTabs({ activeTab, onTabChange }: GiftTabsProps) {
  return (
    <div className="bg-white rounded-lg mb-6 shadow-sm border border-neutral-200">
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => onTabChange('target')}
          className={`flex-1 px-6 py-3 text-center font-medium transition ${
            activeTab === 'target'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          선물 대상
        </button>
        <button
          onClick={() => onTabChange('budget')}
          className={`flex-1 px-6 py-3 text-center font-medium transition ${
            activeTab === 'budget'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          예산별
        </button>
        <button
          onClick={() => onTabChange('featured')}
          className={`flex-1 px-6 py-3 text-center font-medium transition ${
            activeTab === 'featured'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          실시간 인기
        </button>
      </div>
    </div>
  )
}

