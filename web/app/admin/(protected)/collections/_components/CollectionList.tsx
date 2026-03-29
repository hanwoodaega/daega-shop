'use client'

import type { Collection } from '../_types'

interface CollectionListProps {
  collections: Collection[]
  selectedCollection: Collection | null
  onSelectCollection: (collection: Collection) => void
}

export default function CollectionList({
  collections,
  selectedCollection,
  onSelectCollection,
}: CollectionListProps) {
  if (collections.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-bold mb-4">컬렉션 목록</h2>
        <div className="text-center py-8 text-gray-500">
          컬렉션이 없습니다
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-bold mb-4">컬렉션 목록</h2>
      <div className="space-y-2">
        {collections.map((collection) => (
          <div
            key={collection.id}
            onClick={() => onSelectCollection(collection)}
            className={`p-3 rounded-lg cursor-pointer transition ${
              selectedCollection?.id === collection.id
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium">{collection.type}</h3>
                {collection.title && (
                  <p className="text-xs text-gray-500 mt-1">{collection.title}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">순서: {collection.sort_order ?? 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
