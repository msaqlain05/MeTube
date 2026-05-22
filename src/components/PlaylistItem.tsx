import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Trash2 } from 'lucide-react'
import type { VideoItem } from '@/types/video'

interface PlaylistItemProps {
  video: VideoItem
  channel: string
  active?: boolean
  watchPercent?: number
  onClick?: () => void
  onRemove?: () => void
}

export function PlaylistItem({
  video,
  channel,
  active,
  watchPercent = 0,
  onClick,
  onRemove,
}: PlaylistItemProps) {
  const showProgress = watchPercent > 0 && watchPercent < 100
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  return (
    <div className={`rail-item${active ? ' rail-item--active' : ''}`}>
      <button
        type="button"
        className="rail-item__main"
        onClick={onClick}
        aria-current={active ? 'true' : undefined}
      >
        <div className={`rail-item__thumb${active ? ' rail-item__thumb--active' : ''}`}>
          <img src={video.thumbnail ?? undefined} alt="" loading="lazy" />
          {showProgress && (
            <div className="rail-item__progress" aria-hidden>
              <div
                className="rail-item__progress-fill"
                style={{ width: `${watchPercent}%` }}
              />
            </div>
          )}
          <span className="rail-item__duration">{video.durationLabel}</span>
        </div>
        <div className="rail-item__info">
          <p className="rail-item__title">{video.name.replace(/\.[^/.]+$/, '')}</p>
          <p className="rail-item__channel">{channel}</p>
        </div>
      </button>

      <div className="rail-item__menu-wrap" ref={menuRef}>
        <button
          type="button"
          className="rail-item__menu-btn"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((o) => !o)
          }}
          aria-label="Video options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreVertical size={18} strokeWidth={1.75} />
        </button>

        {menuOpen && (
          <div className="rail-item__dropdown" role="menu">
            <button
              type="button"
              className="rail-item__dropdown-item rail-item__dropdown-item--danger"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation()
                onRemove?.()
                setMenuOpen(false)
              }}
            >
              <Trash2 size={16} strokeWidth={1.75} />
              Remove from playlist
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
