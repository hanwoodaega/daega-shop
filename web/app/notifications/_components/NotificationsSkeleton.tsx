export default function NotificationsSkeleton() {
  return (
    <main className="flex-1 container mx-auto px-4 py-6 pb-24">
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    </main>
  )
}


