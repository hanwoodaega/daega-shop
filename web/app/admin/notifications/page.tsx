'use client'

import { useNotifications } from './_hooks/useNotifications'
import NotificationForm from './_components/NotificationForm'
import RecipientTable from './_components/RecipientTable'
import RecipientToolbar from './_components/RecipientToolbar'
import AdminPageLayout from '../_components/AdminPageLayout'

export default function AdminNotificationsPage() {
  const {
    formData,
    updateField,
    selectedUserIds,
    loading,
    sending,
    searchQuery, setSearchQuery,
    filteredUsers,
    allSelected,
    toggleUser,
    toggleAll,
    sendNotifications
  } = useNotifications()

  const handleSend = async () => {
    if (!confirm(`${selectedUserIds.size}명에게 알림을 발송하시겠습니까?`)) {
      return
    }
    const success = await sendNotifications()
    if (success) {
      // 추가 로직
    }
  }

  return (
    <AdminPageLayout 
      title="알림 발송"
      description="사용자들에게 시스템 알림 및 공지사항을 발송합니다"
    >
      <NotificationForm
        formData={formData}
        onUpdateField={updateField}
      />

      <div className="mb-6">
        <RecipientToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectAll={toggleAll}
        />

        <RecipientTable
          loading={loading}
          users={filteredUsers}
          selectedUserIds={selectedUserIds}
          allSelected={allSelected}
          onToggleUser={toggleUser}
          onToggleAll={toggleAll}
        />

        <div className="mt-2 text-sm text-gray-600">
          선택된 수신자: <span className="font-semibold">{selectedUserIds.size}명</span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={sending || !formData.title.trim() || !formData.content.trim() || selectedUserIds.size === 0}
          className="px-6 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? '발송 중...' : '알림 발송'}
        </button>
      </div>
    </AdminPageLayout>
  )
}
