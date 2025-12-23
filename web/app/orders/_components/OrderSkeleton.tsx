import OrderItemSkeleton from '@/components/skeletons/OrderItemSkeleton'

export default function OrderSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <OrderItemSkeleton key={i} />
      ))}
    </div>
  )
}

