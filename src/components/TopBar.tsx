import { useState, useRef, useEffect } from 'react'
import {
  Menu,
  Search,
  Mic,
  Plus,
  Bell,
  FolderOpen,
  ListPlus,
  FileVideo,
} from 'lucide-react'
import { MeTubeLogo } from '@/components/MeTubeLogo'

interface TopBarProps {
  search: string
  onSearchChange: (q: string) => void
  onMenuClick: () => void
  onImportFolder: () => void
  onNewPlaylist: () => void
  onAddVideo: () => void
  hasActivePlaylist: boolean
}

export function TopBar({
  search,
  onSearchChange,
  onMenuClick,
  onImportFolder,
  onNewPlaylist,
  onAddVideo,
  hasActivePlaylist,
}: TopBarProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const createRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setCreateOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="topbar__icon-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={24} strokeWidth={1.5} />
        </button>
        <a
          href="/"
          className="topbar__logo"
          onClick={(e) => e.preventDefault()}
          aria-label="MeTube home"
        >
          <MeTubeLogo />
        </a>
      </div>

      <div className="topbar__center">
        <form
          className="topbar__search"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="search"
            className="topbar__search-input"
            placeholder="Search in playlist"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button type="submit" className="topbar__search-btn" aria-label="Search">
            <Search size={20} strokeWidth={2} />
          </button>
        </form>
        <button type="button" className="topbar__icon-btn topbar__mic" aria-label="Voice search">
          <Mic size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className="topbar__right">
        <div className="topbar__create-wrap" ref={createRef}>
          <button
            type="button"
            className="topbar__create-btn"
            onClick={() => setCreateOpen((o) => !o)}
          >
            <Plus size={20} strokeWidth={2} />
            Create
          </button>
          {createOpen && (
            <div className="topbar__dropdown">
              <button
                type="button"
                className="topbar__dropdown-item"
                onClick={() => {
                  onNewPlaylist()
                  setCreateOpen(false)
                }}
              >
                <ListPlus size={18} strokeWidth={1.75} />
                New playlist
              </button>
              <button
                type="button"
                className="topbar__dropdown-item"
                onClick={() => {
                  onImportFolder()
                  setCreateOpen(false)
                }}
              >
                <FolderOpen size={18} strokeWidth={1.75} />
                Import folder
              </button>
              {hasActivePlaylist && (
                <button
                  type="button"
                  className="topbar__dropdown-item"
                  onClick={() => {
                    onAddVideo()
                    setCreateOpen(false)
                  }}
                >
                  <FileVideo size={18} strokeWidth={1.75} />
                  Add media to playlist
                </button>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="topbar__icon-btn topbar__notify"
          aria-label="Notifications"
        >
          <Bell size={24} strokeWidth={1.5} />
          <span className="topbar__badge">9+</span>
        </button>
        <button type="button" className="topbar__avatar" aria-label="Account">
          C
        </button>
      </div>
    </header>
  )
}
