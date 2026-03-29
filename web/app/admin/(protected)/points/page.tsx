'use client'

import AdminPageLayout from '@/app/admin/_components/AdminPageLayout'
import { useAdminPoints } from './_hooks/useAdminPoints'
import PointStats from './_components/PointStats'
import UserSearchBar from './_components/UserSearchBar'
import UserPointList from './_components/UserPointList'
import PointForm from './_components/PointForm'

export default function AdminPointsPage() {
  const {
    users,
    userPoints,
    loading,
    selectedUsers,
    selectedUserSummaries,
    searchTerm,
    setSearchTerm,
    formData,
    isSubmitting,
    filteredUserList,
    totalUserCount,
    selectedUserCount,
    selectedUsersTotalPoints,
    handleUserSelect,
    handleToggleAll,
    updateFormField,
    handleSubmit,
  } = useAdminPoints()

  if (loading) {
    return (
      <AdminPageLayout title="포인트 관리">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout title="포인트 관리">
      {/* 상단 요약 카드 */}
      <PointStats
        totalUserCount={totalUserCount}
        selectedUserCount={selectedUserCount}
        selectedUsersTotalPoints={selectedUsersTotalPoints}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 고객 선택 영역 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">고객 선택</h2>
            <button
              onClick={handleToggleAll}
              className="text-sm text-primary-800 hover:text-primary-900 font-medium"
            >
              {selectedUsers.length === filteredUserList.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          {/* 검색 */}
          <UserSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          {/* 고객 목록 */}
          <UserPointList
            users={filteredUserList}
            userPoints={userPoints}
            selectedUsers={selectedUsers}
            onUserSelect={handleUserSelect}
            emptyMessage={searchTerm ? '검색 결과가 없습니다.' : '고객이 없습니다.'}
          />
        </div>

        {/* 포인트 적립 폼 */}
        <PointForm
          selectedUserSummaries={selectedUserSummaries}
          formData={formData}
          isSubmitting={isSubmitting}
          onUpdateField={updateFormField}
          onSubmit={handleSubmit}
        />
      </div>
    </AdminPageLayout>
  )
}
