export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

const STORAGE_KEY = 'cineflow-playback-rate'

export function formatPlaybackSpeed(rate: number): string {
  if (rate === 1) return 'Normal'
  return `${rate}x`
}

export function loadPlaybackRate(): PlaybackSpeed {
  try {
    const raw = parseFloat(localStorage.getItem(STORAGE_KEY) ?? '1')
    if (PLAYBACK_SPEEDS.includes(raw as PlaybackSpeed)) return raw as PlaybackSpeed
  } catch {
    /* ignore */
  }
  return 1
}

export function savePlaybackRate(rate: PlaybackSpeed): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(rate))
  } catch {
    /* ignore */
  }
}

export function cyclePlaybackRate(
  current: PlaybackSpeed,
  direction: 'up' | 'down',
): PlaybackSpeed {
  const idx = PLAYBACK_SPEEDS.indexOf(current)
  const next = direction === 'up' ? idx + 1 : idx - 1
  if (next < 0) return PLAYBACK_SPEEDS[0]
  if (next >= PLAYBACK_SPEEDS.length) return PLAYBACK_SPEEDS[PLAYBACK_SPEEDS.length - 1]
  return PLAYBACK_SPEEDS[next]
}

const VOLUME_KEY = 'cineflow-volume'
const MUTED_KEY = 'cineflow-muted'

export function loadVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '1')
    if (Number.isFinite(v) && v >= 0 && v <= 1) return v
  } catch {
    /* ignore */
  }
  return 1
}

export function saveVolume(volume: number): void {
  try {
    localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, volume))))
  } catch {
    /* ignore */
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === '1'
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
}
