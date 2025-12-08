interface OrderButtonsProps {
  index: number
  totalLength: number
  isReordering: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}

export default function OrderButtons({
  index,
  totalLength,
  isReordering,
  onMoveUp,
  onMoveDown,
}: OrderButtonsProps) {
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={onMoveUp}
        disabled={index === 0 || isReordering}
        className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="위로 이동"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        onClick={onMoveDown}
        disabled={index === totalLength - 1 || isReordering}
        className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="아래로 이동"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}

