import { GripHorizontal, GripVertical } from 'lucide-react'

interface ResizeHandleProps {
  orientation: 'vertical' | 'horizontal'
  dragging?: boolean
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void
  onDoubleClick?: () => void
  label: string
}

export function ResizeHandle({
  orientation,
  dragging,
  onPointerDown,
  onKeyDown,
  onDoubleClick,
  label,
}: ResizeHandleProps) {
  const isVertical = orientation === 'vertical'
  const Grip = isVertical ? GripVertical : GripHorizontal

  return (
    <div
      className={`resize-handle resize-handle--${orientation}${dragging ? ' resize-handle--dragging' : ''}`}
      role="separator"
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuetext="Drag to resize. Use arrow keys to adjust. Double-click to reset."
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
    >
      <span className="resize-handle__grip" aria-hidden>
        <Grip size={isVertical ? 16 : 18} strokeWidth={2} />
      </span>
    </div>
  )
}
