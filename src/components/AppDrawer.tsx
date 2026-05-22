import {
  X,
  FolderOpen,
  Plus,
  ListMusic,
  Folder,
  Trash2,
  FileVideo,
  Play,
} from 'lucide-react'
import { MeTubeLogo } from '@/components/MeTubeLogo'
import type { StoredPlaylist } from '@/types/playlist'

interface AppDrawerProps {
  open: boolean
  onClose: () => void
  playlists: StoredPlaylist[]
  activePlaylistId: string | null
  onSelectPlaylist: (id: string) => void
  onRemovePlaylist: (id: string) => void
  onImportFolder: () => void
  onNewPlaylist: () => void
  onAddVideo: (playlistId: string) => void
}

export function AppDrawer({
  open,
  onClose,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onRemovePlaylist,
  onImportFolder,
  onNewPlaylist,
  onAddVideo,
}: AppDrawerProps) {
  if (!open) return null

  const sorted = [...playlists].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-label="Library menu">
        <div className="drawer__header">
          <MeTubeLogo className="drawer__brand" size="compact" />
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        <div className="drawer__section">
          <p className="drawer__section-label">Quick actions</p>
          <div className="drawer__actions">
            <button
              type="button"
              className="drawer__action"
              onClick={() => {
                onImportFolder()
                onClose()
              }}
            >
              <FolderOpen size={20} strokeWidth={1.75} />
              <span>
                <span className="drawer__action-title">Import folder</span>
                <span className="drawer__action-desc">New playlist from a folder</span>
              </span>
            </button>
            <button
              type="button"
              className="drawer__action"
              onClick={() => {
                onNewPlaylist()
                onClose()
              }}
            >
              <Plus size={20} strokeWidth={1.75} />
              <span>
                <span className="drawer__action-title">New playlist</span>
                <span className="drawer__action-desc">Empty playlist, add media after</span>
              </span>
            </button>
            {activePlaylistId && (
              <button
                type="button"
                className="drawer__action"
                onClick={() => {
                  onAddVideo(activePlaylistId)
                  onClose()
                }}
              >
                <FileVideo size={20} strokeWidth={1.75} />
                <span>
                  <span className="drawer__action-title">Add video</span>
                  <span className="drawer__action-desc">To current playlist</span>
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="drawer__section drawer__section--grow">
          <p className="drawer__section-label">
            Your playlists
            <span className="drawer__count">{playlists.length}</span>
          </p>
          <ul className="drawer__list">
            {sorted.length === 0 && (
              <li className="drawer__empty">
                No playlists yet. Import a folder or create one above.
              </li>
            )}
            {sorted.map((pl) => {
              const isActive = activePlaylistId === pl.id
              return (
                <li key={pl.id}>
                  <div
                    className={`drawer__item${isActive ? ' drawer__item--active' : ''}`}
                  >
                    <button
                      type="button"
                      className="drawer__item-main"
                      onClick={() => {
                        onSelectPlaylist(pl.id)
                        onClose()
                      }}
                    >
                      <span className="drawer__item-icon" aria-hidden="true">
                        {pl.source === 'manual' ? (
                          <ListMusic size={20} strokeWidth={1.75} />
                        ) : (
                          <Folder size={20} strokeWidth={1.75} />
                        )}
                      </span>
                      <span className="drawer__item-text">
                        <span className="drawer__item-name">{pl.name}</span>
                        <span className="drawer__item-meta">
                          {pl.videos.length} item{pl.videos.length !== 1 ? 's' : ''}
                          {pl.source === 'manual' ? ' · Custom' : ' · Folder'}
                        </span>
                      </span>
                      {isActive && (
                        <span className="drawer__item-playing" aria-label="Active">
                          <Play size={14} fill="currentColor" />
                        </span>
                      )}
                    </button>
                    <div className="drawer__item-actions">
                      <button
                        type="button"
                        className="drawer__item-action"
                        onClick={() => onAddVideo(pl.id)}
                        aria-label={`Add media to ${pl.name}`}
                        title="Add media"
                      >
                        <FileVideo size={16} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="drawer__item-action drawer__item-action--danger"
                        onClick={() => onRemovePlaylist(pl.id)}
                        aria-label={`Remove ${pl.name}`}
                        title="Delete playlist"
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>
    </>
  )
}
