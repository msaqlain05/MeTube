export interface VideoWatchProgress {
  position: number
  duration: number
  updatedAt: number
}

export interface WatchProgressStore {
  version: 1
  items: Record<string, VideoWatchProgress>
}
