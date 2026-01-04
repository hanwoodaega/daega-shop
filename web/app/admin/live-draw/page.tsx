'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import AdminPageLayout from '../_components/AdminPageLayout'
import LiveDrawForm from './_components/LiveDrawForm'
import type { LiveDrawWithEffectiveStatus, LiveDrawFormData } from '@/lib/livedraw/livedraw.types'
import { convertLocalToISO, convertUTCToLocal } from '@/lib/utils/time-utils'

export default function LiveDrawPage() {
  const [liveDraw, setLiveDraw] = useState<LiveDrawWithEffectiveStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<LiveDrawFormData>({
    status: 'upcoming',
    manual_status: null,
    live_date: '',
    youtube_live_id: '',
    youtube_replay_id: '',
    title: '',
    description: '',
  })

  const fetchLiveDraw = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/live-draw')
      const data = await res.json()
      if (res.ok) {
        if (data.liveDraw) {
          setLiveDraw(data.liveDraw)
          setFormData({
            status: data.liveDraw.status,
            manual_status: data.liveDraw.manual_status,
            live_date: convertUTCToLocal(data.liveDraw.live_date),
            youtube_live_id: data.liveDraw.youtube_live_id || '',
            youtube_replay_id: data.liveDraw.youtube_replay_id || '',
            title: data.liveDraw.title || '',
            description: data.liveDraw.description || '',
          })
        }
      } else {
        const errorMessage = data.error || data.details || '라이브 추첨 조회에 실패했습니다'
        console.error('라이브 추첨 조회 에러:', data)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('라이브 추첨 조회 실패:', error)
      toast.error('라이브 추첨 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLiveDraw()
  }, [fetchLiveDraw])

  const updateFormField = useCallback(
    <K extends keyof LiveDrawFormData>(field: K, value: LiveDrawFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(async () => {
    try {
      const payload = {
        status: formData.status,
        manual_status: formData.manual_status || null,
        live_date: convertLocalToISO(formData.live_date),
        youtube_live_id: formData.youtube_live_id || null,
        youtube_replay_id: formData.youtube_replay_id || null,
        title: formData.title || null,
        description: formData.description || null,
      }

      const res = await fetch('/api/admin/live-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('라이브 추첨이 저장되었습니다')
        await fetchLiveDraw()
      } else {
        toast.error(data.error || '저장에 실패했습니다')
      }
    } catch (error) {
      console.error('라이브 추첨 저장 실패:', error)
      toast.error('저장에 실패했습니다')
    }
  }, [formData, fetchLiveDraw])

  if (loading) {
    return (
      <AdminPageLayout title="라이브 추첨 관리">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout title="라이브 추첨 관리">
      <div className="max-w-4xl mx-auto">
        <LiveDrawForm
          liveDraw={liveDraw}
          formData={formData}
          onUpdateField={updateFormField}
          onSubmit={handleSubmit}
        />
      </div>
    </AdminPageLayout>
  )
}

