import { VideoPlayer } from '@/components/VideoPlayer'
import { RESUME_MIN_SECONDS } from '@/lib/watchProgress'
import { formatDuration } from '@/lib/videoUtils'
import type { VideoItem } from '@/types/video'

interface WatchPanelProps {
  video: VideoItem | null
  loading: boolean
  needsRelink: boolean
  canGrantFolderAccess?: boolean
  resumePosition?: number | null
  onGrantFolderAccess?: () => void
  onRelinkClick: () => void
  onEnded: () => void
  onWatchProgress?: (position: number, duration: number, force?: boolean) => void
}

export function WatchPanel({
  video,
  loading,
  needsRelink,
  canGrantFolderAccess = false,
  resumePosition = null,
  onGrantFolderAccess,
  onRelinkClick,
  onEnded,
  onWatchProgress,
}: WatchPanelProps) {
  const canPlay = video && video.url.length > 0 && !needsRelink
  const resumeLabel =
    resumePosition != null && resumePosition >= RESUME_MIN_SECONDS
      ? formatDuration(resumePosition)
      : ''

  return (
    <main className="watch">
      <div className="watch__player-area">
        <div className="watch__media">
          <div className="watch__player">
            {loading ? (
              <div className="watch__placeholder">
                <div className="watch__spinner" />
              </div>
            ) : canPlay && video ? (
              <VideoPlayer
                key={video.id}
                video={video}
                initialPosition={resumePosition}
                onWatchProgress={onWatchProgress}
                onEnded={onEnded}
              />
            ) : needsRelink && video ? (
              <div className="watch__placeholder watch__placeholder--access">
                {canGrantFolderAccess && onGrantFolderAccess ? (
                  <>
                    <p className="watch__access-hint">
                      Allow access so this folder keeps working after you close the tab.
                    </p>
                    <button
                      type="button"
                      className="watch__cta watch__cta--primary"
                      onClick={onGrantFolderAccess}
                    >
                      Allow folder access
                    </button>
                  </>
                ) : null}
                <button type="button" className="watch__cta" onClick={onRelinkClick}>
                  {canGrantFolderAccess ? 'Choose folder again' : 'Relink folder'}
                </button>
              </div>
            ) : (
              <div className="watch__placeholder" />
            )}
          </div>

          {video && !loading && (
            <div className="watch__details">
              <h1 className="watch__title">
                {video.name.replace(/\.[^/.]+$/, '')}
              </h1>
              {resumeLabel && (
                <p className="watch__resume">Resumes from {resumeLabel}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
