import type { VideoWatchProgress, WatchProgressStore } from '@/types/watchProgress'

const STORAGE_KEY = 'cineflow-watch-progress'

export const RESUME_MIN_SECONDS = 3
export const RESUME_END_BUFFER_SECONDS = 10
export const COMPLETE_RATIO = 0.95

const SAVE_THROTTLE_MS = 2500

let cache: WatchProgressStore | null = null
const lastSaveByKey = new Map<string, number>()

function progressKey(playlistId: string, videoId: string): string {
  return `${playlistId}:${videoId}`
}

function emptyStore(): WatchProgressStore {
  return { version: 1, items: {} }
}

function readFromStorage(): WatchProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as WatchProgressStore
    if (parsed?.version !== 1 || typeof parsed.items !== 'object') {
      return emptyStore()
    }
    return parsed
  } catch {
    return emptyStore()
  }
}

function getStore(): WatchProgressStore {
  if (!cache) cache = readFromStorage()
  return cache
}

function commitStore(): void {
  if (!cache) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.error('Failed to save watch progress:', e)
  }
}

function shouldPersist(key: string, force: boolean): boolean {
  if (force) return true
  const now = Date.now()
  const last = lastSaveByKey.get(key) ?? 0
  if (now - last < SAVE_THROTTLE_MS) return false
  lastSaveByKey.set(key, now)
  return true
}

function isComplete(position: number, duration: number): boolean {
  return duration > 0 && position / duration >= COMPLETE_RATIO
}

function shouldStorePosition(position: number, duration: number): boolean {
  if (position < RESUME_MIN_SECONDS) return false
  if (!Number.isFinite(duration) || duration <= 0) return false
  if (position >= duration - RESUME_END_BUFFER_SECONDS) return false
  if (isComplete(position, duration)) return false
  return true
}

export function getWatchProgress(
  playlistId: string,
  videoId: string,
): VideoWatchProgress | null {
  return getStore().items[progressKey(playlistId, videoId)] ?? null
}

export function getResumePosition(
  playlistId: string,
  videoId: string,
  videoDuration?: number,
): number | null {
  const item = getWatchProgress(playlistId, videoId)
  if (!item) return null

  const duration =
    videoDuration && videoDuration > 0 ? videoDuration : item.duration
  if (!shouldStorePosition(item.position, duration)) return null

  return Math.min(item.position, duration - 1)
}

export function getWatchPercent(
  playlistId: string,
  videoId: string,
  fallbackDuration?: number,
): number {
  const item = getWatchProgress(playlistId, videoId)
  if (!item) return 0

  const duration =
    fallbackDuration && fallbackDuration > 0 ? fallbackDuration : item.duration
  if (!Number.isFinite(duration) || duration <= 0) return 0

  const ratio = item.position / duration
  if (ratio >= COMPLETE_RATIO) return 100
  return Math.min(100, Math.max(0, ratio * 100))
}

export function saveWatchProgress(
  playlistId: string,
  videoId: string,
  position: number,
  duration: number,
  options?: { force?: boolean },
): boolean {
  if (!playlistId || !videoId) return false
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return false

  const key = progressKey(playlistId, videoId)
  if (!shouldPersist(key, options?.force ?? false)) return false

  const store = getStore()

  if (!shouldStorePosition(position, duration)) {
    if (store.items[key]) {
      delete store.items[key]
      commitStore()
      return true
    }
    return false
  }

  store.items[key] = {
    position,
    duration,
    updatedAt: Date.now(),
  }
  commitStore()
  return true
}

export function clearWatchProgress(playlistId: string, videoId: string): void {
  const store = getStore()
  delete store.items[progressKey(playlistId, videoId)]
  commitStore()
  lastSaveByKey.delete(progressKey(playlistId, videoId))
}

export function clearPlaylistWatchProgress(playlistId: string): void {
  const store = getStore()
  const prefix = `${playlistId}:`
  for (const key of Object.keys(store.items)) {
    if (key.startsWith(prefix)) {
      delete store.items[key]
      lastSaveByKey.delete(key)
    }
  }
  commitStore()
}
