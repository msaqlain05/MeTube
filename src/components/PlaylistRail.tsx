import { Search } from 'lucide-react'
import { PlaylistItem } from '@/components/PlaylistItem'
import type { VideoItem } from '@/types/video'
import type { StoredPlaylist } from '@/types/playlist'

interface PlaylistRailProps {
  playlist: StoredPlaylist | null
  videos: VideoItem[]
  activeId: string | null
  search: string
  onSearchChange: (q: string) => void
  importError: string | null
  onSelectVideo: (id: string) => void
  onRemoveVideo: (videoId: string) => void
  getWatchPercent?: (videoId: string, duration?: number) => number
}

export function PlaylistRail({
  playlist,
  videos,
  activeId,
  search,
  onSearchChange,
  importError,
  onSelectVideo,
  onRemoveVideo,
  getWatchPercent,
}: PlaylistRailProps) {
  const filtered = videos.filter(
    (v) =>
      v.displayTitle.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <aside className="rail">
      <div className="rail__panel">
        <header className="rail__header">
          <div className="rail__header-text">
            <h2 className="rail__title">{playlist?.name ?? 'Playlist'}</h2>
            <p className="rail__meta">
              {videos.length} {videos.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <form
            className="rail__search"
            onSubmit={(e) => e.preventDefault()}
          >
            <Search size={18} strokeWidth={2} className="rail__search-icon" aria-hidden />
            <input
              type="search"
              className="rail__search-input"
              placeholder="Search in playlist"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search in playlist"
            />
          </form>
        </header>

        {importError && (
          <p className="rail__error" role="alert">
            {importError}
          </p>
        )}

        <div className="rail__list">
          {filtered.length === 0 && (
            <p className="rail__empty">
              {videos.length === 0
                ? 'No media in this playlist'
                : 'No search results'}
            </p>
          )}
          {filtered.map((video) => (
            <PlaylistItem
              key={video.id}
              video={video}
              channel={playlist?.name ?? 'Local'}
              active={activeId === video.id}
              onClick={() => onSelectVideo(video.id)}
              onRemove={() => onRemoveVideo(video.id)}
              watchPercent={getWatchPercent?.(video.id, video.duration) ?? 0}
            />
          ))}
        </div>
      </div>
    </aside>
  )
}
