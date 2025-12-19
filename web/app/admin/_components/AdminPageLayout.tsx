'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface AdminPageLayoutProps {
  title: string
  description?: string
  extra?: ReactNode
  children: ReactNode
}

export default function AdminPageLayout({
  title,
  description,
  extra,
  children
}: AdminPageLayoutProps) {
  const router = useRouter()
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {description && <p className="text-gray-600 mt-1">{description}</p>}
            </div>
          </div>
          {extra && <div>{extra}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}

