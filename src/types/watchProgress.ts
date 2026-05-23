export interface VideoWatchProgress {
  position: number
  duration: number
  updatedAt: number
}

export interface WatchProgressStore {
  version: 1
  items: Record<string, VideoWatchProgress>
}

// define a type that is a record of string and VideoWatchProgressss